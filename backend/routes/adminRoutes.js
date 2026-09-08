const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const User = require("../models/User");
const LeetCodeStats = require("../models/LeetCodeStats");
const RefreshToken = require("../models/RefreshToken");
const cloudinary = require("../config/cloudinary");

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

        if (name !== undefined) user.name = name;
        if (year !== undefined) user.year = year;
        if (whatsappNumber !== undefined) user.whatsappNumber = whatsappNumber;

        await user.save();

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
// their Cloudinary profile picture.
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

        if (user.profilePicturePublicId) {
            await cloudinary.uploader.destroy(user.profilePicturePublicId);
        }

        await Promise.all([
            LeetCodeStats.deleteOne({ userId: user._id }),
            RefreshToken.deleteMany({ userId: user._id }),
            User.deleteOne({ _id: user._id })
        ]);

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
// Batch sync every student. Respects the 6-hour cache
// unless { "force": true } is sent in the body.
// ======================================================
router.post(
    "/sync/all",
    asyncHandler(async (req, res) => {

        const force = req.body?.force === true;

        const { summary, failures } = await syncAllStudents({ force });

        return res.json({
            message: "Sync run completed.",
            summary,
            failures
        });
    })
);


module.exports = router;
