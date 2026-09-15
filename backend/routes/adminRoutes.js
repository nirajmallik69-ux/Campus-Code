const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const User = require("../models/User");
const LeetCodeStats = require("../models/LeetCodeStats");
const AuditLog = require("../models/AuditLog");
const { permanentlyDeleteStudent } = require("../services/accountService");
const { runYearProgression } = require("../services/yearProgressionService");

// A malformed :id (wrong length/characters) would otherwise reach
// Mongoose and throw a CastError, which the generic error handler
// reports as a 500. Checking it here up front keeps that a clean,
// expected 400 instead of looking like a server fault.
const requireValidObjectId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
            message: "Invalid student id."
        });
    }
    next();
};

const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");
const asyncHandler = require("../middleware/asyncHandler");

const {
    listStudentsQuerySchema,
    adminUpdateStudentSchema
} = require("../validation/adminValidation");

const {
    syncStudentStats,
    syncAllStudents
} = require("../services/syncService");

// Every admin route requires a valid token AND the admin role.
router.use(authenticateToken, requireAdmin);


// ======================================================
// GET /api/admin/stats
// Dashboard overview - cheap counts/aggregations only.
// ======================================================
router.get(
    "/stats",
    asyncHandler(async (req, res) => {

        const [
            totalStudents,
            byYear,
            totalWithStats,
            lastSynced
        ] = await Promise.all([
            User.countDocuments({ role: "student" }),

            User.aggregate([
                { $match: { role: "student" } },
                { $group: { _id: "$year", count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),

            LeetCodeStats.countDocuments({
                lastUpdated: { $ne: null }
            }),

            LeetCodeStats.findOne({ lastUpdated: { $ne: null } })
                .sort({ lastUpdated: -1 })
                .select("lastUpdated leetcodeUsername")
        ]);

        return res.json({
            totalStudents,
            byYear: byYear.map((row) => ({
                year: row._id,
                count: row.count
            })),
            totalWithSyncedStats: totalWithStats,
            lastSync: lastSynced
                ? {
                    at: lastSynced.lastUpdated,
                    leetcodeUsername: lastSynced.leetcodeUsername
                }
                : null
        });
    })
);


// ======================================================
// GET /api/admin/students
// Search / filter / paginate. Never loads the full
// collection into memory - filtering happens in MongoDB.
// ======================================================
router.get(
    "/students",
    asyncHandler(async (req, res) => {

        const result = listStudentsQuerySchema.safeParse(req.query);

        if (!result.success) {
            return res.status(400).json({
                message: result.error.issues[0].message
            });
        }

        const { page, limit, search, year } = result.data;

        const filter = { role: "student" };

        if (year !== undefined) {
            filter.year = year;
        }

        if (search) {
            // Anchored, case-insensitive prefix match so the
            // query can still use the indexes on these fields
            // instead of a full collection scan.
            const pattern = new RegExp(
                "^" + search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
            );

            filter.$or = [
                { name: pattern },
                { sicId: pattern },
                { leetcodeUsername: pattern },
                { email: pattern }
            ];
        }

        const skip = (page - 1) * limit;

        const [students, total] = await Promise.all([
            User.find(filter)
                .select(
                    "name email sicId year whatsappNumber leetcodeUsername profilePicture role createdAt"
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            User.countDocuments(filter)
        ]);

        return res.json({
            page,
            limit,
            totalStudents: total,
            totalPages: Math.ceil(total / limit),
            students
        });
    })
);


// ======================================================
// GET /api/admin/students/:id
// Full detail view for one student, including LeetCode stats.
// ======================================================
router.get(
    "/students/:id",
    requireValidObjectId,
    asyncHandler(async (req, res) => {

        const user = await User.findById(req.params.id).select("-__v");

        if (!user) {
            return res.status(404).json({
                message: "Student not found."
            });
        }

        const stats = await LeetCodeStats.findOne({
            userId: user._id
        }).select("-__v");

        return res.json({ user, stats });
    })
);


// ======================================================
// PATCH /api/admin/students/:id
// Admin-only profile edit - including LeetCode username,
// which students can no longer change themselves.
// ======================================================
router.patch(
    "/students/:id",
    requireValidObjectId,
    asyncHandler(async (req, res) => {

        const result = adminUpdateStudentSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: result.error.issues[0].message
            });
        }

        const { name, year, whatsappNumber, leetcodeUsername } = result.data;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "Student not found."
            });
        }

        const changes = {};

        if (leetcodeUsername && leetcodeUsername !== user.leetcodeUsername) {

            const existingLeetcode = await User.findOne({
                leetcodeUsername,
                _id: { $ne: user._id }
            });

            if (existingLeetcode) {
                return res.status(409).json({
                    message: "LeetCode username is already registered."
                });
            }

            changes.leetcodeUsername = { from: user.leetcodeUsername, to: leetcodeUsername };
            user.leetcodeUsername = leetcodeUsername;

            // Same reasoning as the old self-service flow: cached
            // stats belong to the OLD username, so wipe them and
            // point at the new one rather than showing stale numbers
            // under a different name.
            await LeetCodeStats.findOneAndUpdate(
                { userId: user._id },
                {
                    leetcodeUsername,
                    totalSolved: 0,
                    easySolved: 0,
                    mediumSolved: 0,
                    hardSolved: 0,
                    leetcodePoints: 0,
                    contestRating: 0,
                    leetcodeRank: null,
                    lastUpdated: null
                },
                { upsert: true }
            );
        }

        if (name !== undefined && name !== user.name) {
            changes.name = { from: user.name, to: name };
            user.name = name;
        }
        if (year !== undefined && year !== user.year) {
            changes.year = { from: user.year, to: year };
            user.year = year;
            user.yearUpdatedAt = new Date();
        }
        if (whatsappNumber !== undefined && whatsappNumber !== user.whatsappNumber) {
            changes.whatsappNumber = { from: user.whatsappNumber, to: whatsappNumber };
            user.whatsappNumber = whatsappNumber;
        }

        await user.save();

        await AuditLog.create({
            actorType: "admin",
            actorId: req.user.userId,
            actorName: req.user.name || req.user.email,
            action: "edit_student",
            targetType: "User",
            targetId: user._id,
            details: { sicId: user.sicId, changes }
        });

        return res.json({
            message: "Student updated successfully.",
            user
        });
    })
);


// ======================================================
// DELETE /api/admin/students/:id
// Permanently removes a student account: the user document,
// their cached LeetCode stats, their active sessions, and
// their Cloudinary profile picture. This is the manual,
// explicit, irreversible action - the automatic year-based
// cleanup (services/yearProgressionService.js) does the same
// permanent removal for graduating 4th-years, one year after
// they became 4th-years.
// ======================================================
router.delete(
    "/students/:id",
    requireValidObjectId,
    asyncHandler(async (req, res) => {

        if (req.params.id === String(req.user.userId)) {
            return res.status(400).json({
                message: "You cannot delete your own account from the admin panel."
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "Student not found."
            });
        }

        await permanentlyDeleteStudent(user);

        await AuditLog.create({
            actorType: "admin",
            actorId: req.user.userId,
            actorName: req.user.name || req.user.email,
            action: "delete_student",
            targetType: "User",
            targetId: user._id,
            details: { name: user.name, sicId: user.sicId, email: user.email }
        });

        return res.json({
            message: "Student account deleted successfully."
        });
    })
);


// ======================================================
// POST /api/admin/sync/student/:id
// Force-sync a single student regardless of cache age.
// ======================================================
router.post(
    "/sync/student/:id",
    requireValidObjectId,
    asyncHandler(async (req, res) => {

        const stats = await LeetCodeStats.findOne({
            userId: req.params.id
        });

        if (!stats) {
            return res.status(404).json({
                message: "LeetCode stats not found for this student."
            });
        }

        const result = await syncStudentStats(stats, { force: true });

        return res.json({
            message: "Sync attempted.",
            result
        });
    })
);


// ======================================================
// POST /api/admin/sync/all
// Batch sync every student. Respects the 2-hour cache
// unless { "force": true } is sent in the body.
// ======================================================
router.post(
    "/sync/all",
    asyncHandler(async (req, res) => {

        const force = req.body?.force === true;

        const { summary, failures } = await syncAllStudents({ force });

        await AuditLog.create({
            actorType: "admin",
            actorId: req.user.userId,
            actorName: req.user.name || req.user.email,
            action: "sync_all",
            details: { force, ...summary }
        });

        return res.json({
            message: "Sync run completed.",
            summary,
            failures
        });
    })
);


// ======================================================
// POST /api/admin/run-year-progression
// Manually triggers the yearly promotion/graduation job on
// demand - the same logic that runs automatically once a day.
// Exists mainly for testing (see YEAR_PROGRESSION_DAYS in
// services/yearProgressionService.js) and for demonstrating the
// feature without waiting for the scheduled run.
// ======================================================
router.post(
    "/run-year-progression",
    asyncHandler(async (req, res) => {

        const { promoted, removed } = await runYearProgression();

        await AuditLog.create({
            actorType: "admin",
            actorId: req.user.userId,
            actorName: req.user.name || req.user.email,
            action: "manual_year_progression_trigger",
            details: { promoted, removed }
        });

        return res.json({
            message: "Year progression run completed.",
            promoted,
            removed
        });
    })
);


// ======================================================
// GET /api/admin/audit-log
// Recent admin and automated-system actions (edits, deletes,
// bulk syncs, yearly promotions/graduations), newest first.
// Read-only - entries are never edited or removed via the API.
// ======================================================
router.get(
    "/audit-log",
    asyncHandler(async (req, res) => {

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

        const [entries, total] = await Promise.all([
            AuditLog.find({})
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            AuditLog.countDocuments({})
        ]);

        return res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            entries
        });
    })
);


module.exports = router;
