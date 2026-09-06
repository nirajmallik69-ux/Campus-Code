const express = require("express");

const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");

const LeetCodeStats = require("../models/LeetCodeStats");

const asyncHandler = require("../middleware/asyncHandler");

const User = require("../models/User");

const { getCampusRank, getYearRank } = require("../services/rankService");


// ==========================================
// LEADERBOARD FUNCTION
// ==========================================

const getLeaderboard = async (year = null, page = 1, limit = 20) => {

    const skip = (page - 1) * limit;

    const pipeline = [

        // Connect LeetCodeStats with User
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },

        {
            $unwind: "$user"
        }
    ];


    // Year filter
    if (year !== null) {

        pipeline.push({
            $match: {
                "user.year": year
            }
        });
    }


    // Sort
    pipeline.push({
        $sort: {
            leetcodePoints: -1,
            "user.name": 1,
            "user.sicId": 1
        }
    });


    // Skip students from previous pages
    pipeline.push({
        $skip: skip
    });


    // Get only students for this page
    pipeline.push({
        $limit: limit
    });


    // Select required fields
    pipeline.push({
        $project: {

            _id: 0,

            userId: 1,

            name: "$user.name",

            sicId: "$user.sicId",

            year: "$user.year",

            profilePicture: "$user.profilePicture",

            leetcodeUsername: 1,

            totalSolved: 1,

            easySolved: 1,

            mediumSolved: 1,

            hardSolved: 1,

            leetcodePoints: 1,

            leetcodeRank: 1
        }
    });


    const leaderboard = await LeetCodeStats
        .aggregate(pipeline)
        .collation({
            locale: "en",
            strength: 2
        });


    // Unique rank based on page position
    return leaderboard.map((student, index) => ({
        rank: skip + index + 1,
        ...student
    }));
};


const getLeaderboardCount = async (year = null) => {

    const pipeline = [

        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },

        {
            $unwind: "$user"
        }
    ];


    if (year !== null) {

        pipeline.push({
            $match: {
                "user.year": year
            }
        });
    }


    pipeline.push({
        $count: "total"
    });


    const result = await LeetCodeStats.aggregate(pipeline);

    return result.length > 0 ? result[0].total : 0;
};


// ==========================================
// OVERALL CAMPUS LEADERBOARD
// ==========================================

// Public: anyone can view the campus leaderboard, logged in or not.
router.get(
    "/campus",
    asyncHandler(async (req, res) => {

        let page = Number(req.query.page) || 1;
        let limit = Number(req.query.limit) || 20;


        // Prevent invalid values
        if (page < 1) {
            page = 1;
        }

        if (limit < 1) {
            limit = 20;
        }

        // Prevent someone requesting thousands of students
        if (limit > 100) {
            limit = 100;
        }


        const totalStudents = await getLeaderboardCount();

        const totalPages = Math.ceil(
            totalStudents / limit
        );


        const leaderboard = await getLeaderboard(
            null,
            page,
            limit
        );


        return res.json({

            message: "Campus leaderboard fetched successfully.",

            page,

            limit,

            totalStudents,

            totalPages,

            leaderboard

        });
    })
);

//Me

router.get(
    "/me",
    authenticateToken,
    asyncHandler(async (req, res) => {

        // 1. Get logged-in user's ID
        const userId = req.user.userId;

        // 2. Get user information
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // 3. Get LeetCode stats
        const stats = await LeetCodeStats.findOne({
            userId
        });

        if (!stats) {
            return res.status(404).json({
                message: "LeetCode stats not found."
            });
        }

        // 4. Campus + year rank (shared rankService)
        const [campusRank, yearRank] = await Promise.all([
            getCampusRank(stats, user),
            getYearRank(stats, user)
        ]);


        // 6. Send response
        return res.json({
            campusRank,
            yearRank,
            points: stats.leetcodePoints,
            totalSolved: stats.totalSolved,
            year: user.year
        });
    })
);


// ==========================================
// YEAR-WISE LEADERBOARD
// ==========================================

// Public: anyone can view a year's leaderboard, logged in or not.
router.get(
    "/campus/year/:year",
    asyncHandler(async (req, res) => {

        const year = Number(req.params.year);


        if (![1, 2, 3, 4].includes(year)) {

            return res.status(400).json({
                message: "Year must be between 1 and 4."
            });
        }


        let page = Number(req.query.page) || 1;
        let limit = Number(req.query.limit) || 20;


        if (page < 1) {
            page = 1;
        }

        if (limit < 1) {
            limit = 20;
        }

        if (limit > 100) {
            limit = 100;
        }


        const totalStudents =
            await getLeaderboardCount(year);


        const totalPages = Math.ceil(
            totalStudents / limit
        );


        const leaderboard = await getLeaderboard(
            year,
            page,
            limit
        );


        return res.json({

            message: `Year ${year} leaderboard fetched successfully.`,

            year,

            page,

            limit,

            totalStudents,

            totalPages,

            leaderboard

        });
    })
);


module.exports = router;