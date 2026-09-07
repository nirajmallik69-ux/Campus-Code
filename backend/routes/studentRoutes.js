const express = require("express");
const multer = require("multer");

const router = express.Router();

const User = require("../models/User");
const LeetCodeStats = require("../models/LeetCodeStats");

const asyncHandler = require("../middleware/asyncHandler");
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/upload");
const authenticateToken = require("../middleware/authMiddleware");
const { getCampusRank, getYearRank } = require("../services/rankService");


// ======================================================
// UPDATE PROFILE PICTURE
// PATCH /api/students/:sicId/profile-picture
// ======================================================

router.patch(
    "/:sicId/profile-picture",

    authenticateToken,

    (req, res, next) => {

        upload.single("profilePicture")(req, res, (err) => {

            if (err instanceof multer.MulterError) {

                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({
                        message:
                            "Profile picture must be 500 KB or smaller."
                    });
                }

                return res.status(400).json({
                    message: "File upload failed."
                });
            }

            if (err) {
                return res.status(400).json({
                    message: err.message
                });
            }

            next();
        });
    },

    asyncHandler(async (req, res) => {

        const { sicId } = req.params;


        // Check if an image was uploaded
        if (!req.file) {
            return res.status(400).json({
                message: "Profile picture is required."
            });
        }


        // Find the student
        const user = await User.findOne({
            sicId: sicId.toUpperCase()
        });


        if (!user) {
            return res.status(404).json({
                message: "Student not found."
            });
        }


        // Make sure the logged-in student
        // is updating their own profile picture
        if (
            user._id.toString() !==
            req.user.userId.toString()
        ) {
            return res.status(403).json({
                message:
                    "You can only update your own profile picture."
            });
        }


        // Remember the old Cloudinary image
        const oldPublicId =
            user.profilePicturePublicId;


        // Upload new image to Cloudinary
        const result = await new Promise(
            (resolve, reject) => {

                const uploadStream =
                    cloudinary.uploader.upload_stream(
                        {
                            folder:
                                "campus-code/profile-pictures",

                            transformation: [
                                {
                                    width: 400,
                                    height: 400,
                                    crop: "fill",
                                    gravity: "face"
                                }
                            ]
                        },

                        (error, result) => {

                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }

                        }
                    );

                uploadStream.end(req.file.buffer);
            }
        );


        // Save new Cloudinary data in MongoDB
        user.profilePicture =
            result.secure_url;

        user.profilePicturePublicId =
            result.public_id;

        await user.save();


        // Delete old image from Cloudinary
        if (
            oldPublicId &&
            oldPublicId !== result.public_id
        ) {
            await cloudinary.uploader.destroy(
                oldPublicId
            );
        }


        return res.json({
            message:
                "Profile picture updated successfully.",

            profilePicture:
                user.profilePicture
        });
    })
);


// ======================================================
// GET LOGGED-IN STUDENT DASHBOARD DATA
// GET /api/students/me
// ======================================================

router.get(
    "/me",

    authenticateToken,

    asyncHandler(async (req, res) => {

        // Find logged-in student
        const user = await User.findById(
            req.user.userId
        ).select("-__v");


        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }


        // Find LeetCode statistics
        const stats =
            await LeetCodeStats.findOne({
                userId: user._id
            }).select("-__v");


        if (!stats) {
            return res.status(404).json({
                message:
                    "LeetCode stats not found."
            });
        }


        // Dashboard needs campus + year rank alongside the raw
        // stats - reuse the same rank logic the public profile
        // and leaderboard /me endpoint use, instead of
        // duplicating the aggregation here.
        const [campusRank, yearRank] = await Promise.all([
            getCampusRank(stats, user),
            getYearRank(stats, user)
        ]);


        return res.json({

            user: {

                name: user.name,

                email: user.email,

                sicId: user.sicId,

                year: user.year,

                whatsappNumber:
                    user.whatsappNumber,

                leetcodeUsername:
                    user.leetcodeUsername,

                profilePicture:
                    user.profilePicture,

                role: user.role
            },


            leetcode: {

                totalSolved:
                    stats.totalSolved,

                easySolved:
                    stats.easySolved,

                mediumSolved:
                    stats.mediumSolved,

                hardSolved:
                    stats.hardSolved,

                points:
                    stats.leetcodePoints,

                leetcodeRank:
                    stats.leetcodeRank,

                lastUpdated:
                    stats.lastUpdated
            },


            ranking: {

                campusRank,

                yearRank
            }
        });
    })
);


// ======================================================
// GET PUBLIC STUDENT PROFILE
// GET /api/students/:sicId
// ======================================================

router.get(
    "/:sicId",

    asyncHandler(async (req, res) => {

        const { sicId } = req.params;


        // Find student
        const user = await User.findOne({
            sicId: sicId.toUpperCase()
        }).select("-__v");


        if (!user) {
            return res.status(404).json({
                message:
                    "Student not found."
            });
        }


        // Find LeetCode stats
        const stats =
            await LeetCodeStats.findOne({
                userId: user._id
            }).select("-__v");


        if (!stats) {
            return res.status(404).json({
                message:
                    "LeetCode stats not found."
            });
        }


        // ==================================================
        // Campus + year rank (shared rankService - same
        // tiebreak rule used everywhere ranks are computed)
        // ==================================================

        const [campusRank, yearRank] = await Promise.all([
            getCampusRank(stats, user),
            getYearRank(stats, user)
        ]);


        // ==================================================
        // Send public profile
        // ==================================================

        return res.json({

            name: user.name,

            sicId: user.sicId,

            year: user.year,

            leetcodeUsername:
                user.leetcodeUsername,

            profilePicture:
                user.profilePicture,


            ranking: {

                campusRank:
                    campusRank,

                yearRank:
                    yearRank,

                leetcodeRank:
                    stats.leetcodeRank
            },


            leetcode: {

                totalSolved:
                    stats.totalSolved,

                easySolved:
                    stats.easySolved,

                mediumSolved:
                    stats.mediumSolved,

                hardSolved:
                    stats.hardSolved,

                points:
                    stats.leetcodePoints
            }

        });
    })
);


module.exports = router;