const express = require("express");

const router = express.Router();

const authenticateToken = require("../middleware/authMiddleware");

const LeetCodeStats = require("../models/LeetCodeStats");

const {
    getLeetCodeStats,
    getLeetCodeProfile
} = require("../services/leetcodeService");

const asyncHandler = require("../middleware/asyncHandler");

// LeetCode stats are refreshed at most once every 6 hours
const CACHE_DURATION = 6 * 60 * 60 * 1000;

router.get(
    "/stats",
    authenticateToken,
    asyncHandler(async (req, res) => {

        const userId = req.user.userId;

        const stats = await LeetCodeStats.findOne({
            userId
        });

        if (!stats) {
            return res.status(404).json({
                message: "LeetCode stats not found."
            });
        }

        // -----------------------------------------
        // CHECK CACHE
        // -----------------------------------------

        const now = Date.now();

        const cacheIsValid =
            stats.lastUpdated &&
            (now - stats.lastUpdated.getTime()) < CACHE_DURATION;


        // If cached stats exist but LeetCode rank is missing,
        // try to fetch ONLY the profile/rank.
        if (cacheIsValid && stats.leetcodeRank === null) {

            try {

                const profile = await getLeetCodeProfile(
                    stats.leetcodeUsername
                );

                stats.leetcodeRank = profile.ranking;

                await stats.save();

            } catch (error) {

                console.error(
                    "Failed to fetch LeetCode rank:",
                    error.message
                );
            }

            return res.json({
                message: "LeetCode stats fetched from cache.",
                stats
            });
        }


        // Normal cache
        if (cacheIsValid) {

            return res.json({
                message: "LeetCode stats fetched from cache.",
                stats
            });
        }

        // -----------------------------------------
        // FETCH FRESH DATA FROM LEETCODE
        // -----------------------------------------

        let leetcodeData;
        let profile;

        try {

            leetcodeData = await getLeetCodeStats(
                stats.leetcodeUsername
            );

            profile = await getLeetCodeProfile(
                stats.leetcodeUsername
            );

        } catch (error) {

            console.error(
                "Failed to fetch LeetCode data:",
                error.message
            );

            return res.status(503).json({
                message:
                    "LeetCode service is temporarily unavailable. Please try again later."
            });
        }

        // -----------------------------------------
        // UPDATE DATABASE
        // -----------------------------------------

        stats.totalSolved =
            leetcodeData.solvedProblem;

        stats.easySolved =
            leetcodeData.easySolved;

        stats.mediumSolved =
            leetcodeData.mediumSolved;

        stats.hardSolved =
            leetcodeData.hardSolved;

        // -----------------------------------------
        // CALCULATE CAMPUS CODE LEETCODE SCORE
        // -----------------------------------------

        stats.leetcodePoints =
            (stats.easySolved * 1) +
            (stats.mediumSolved * 2) +
            (stats.hardSolved * 3);

        // -----------------------------------------
        // LEETCODE GLOBAL RANK
        // -----------------------------------------

        stats.leetcodeRank =
            profile.ranking;

        // -----------------------------------------
        // UPDATE TIMESTAMP
        // -----------------------------------------

        stats.lastUpdated = new Date();

        await stats.save();

        // -----------------------------------------
        // RESPONSE
        // -----------------------------------------

        return res.json({
            message: "LeetCode stats updated successfully.",
            stats
        });
    })
);

module.exports = router;