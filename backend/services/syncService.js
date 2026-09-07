const LeetCodeStats = require("../models/LeetCodeStats");

const {
    getLeetCodeStats,
    getLeetCodeProfile
} = require("./leetcodeService");

// Same window used by the student-facing /api/leetcode/stats route,
// kept here too so admin-triggered syncs don't hammer the API for
// students who were already refreshed recently.
const CACHE_DURATION = 2 * 60 * 60 * 1000;

// How many students we sync at once, and how long we pause between
// batches. Kept small and simple on purpose - a full job queue would
// be overkill for the current scale of this project.
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
    Sync one student's LeetCode stats.

    Pass `force: true` to ignore the 2-hour cache (used when an
    admin explicitly re-syncs a single student).

    Returns a small result object instead of throwing, so batch
    sync can keep going after one student fails.
*/
const syncStudentStats = async (statsDoc, { force = false } = {}) => {

    const username = statsDoc.leetcodeUsername;

    if (!force && statsDoc.lastUpdated) {
        const age = Date.now() - statsDoc.lastUpdated.getTime();
        if (age < CACHE_DURATION) {
            return {
                userId: statsDoc.userId,
                username,
                status: "skipped-cached"
            };
        }
    }

    try {
        const [leetcodeData, profile] = await Promise.all([
            getLeetCodeStats(username),
            getLeetCodeProfile(username)
        ]);

        statsDoc.totalSolved = leetcodeData.solvedProblem;
        statsDoc.easySolved = leetcodeData.easySolved;
        statsDoc.mediumSolved = leetcodeData.mediumSolved;
        statsDoc.hardSolved = leetcodeData.hardSolved;

        statsDoc.leetcodePoints =
            (statsDoc.easySolved * 1) +
            (statsDoc.mediumSolved * 2) +
            (statsDoc.hardSolved * 3);

        statsDoc.leetcodeRank = profile.ranking;
        statsDoc.lastUpdated = new Date();

        await statsDoc.save();

        return {
            userId: statsDoc.userId,
            username,
            status: "synced",
            points: statsDoc.leetcodePoints
        };

    } catch (error) {
        return {
            userId: statsDoc.userId,
            username,
            status: "failed",
            error: error.message
        };
    }
};

/*
    Sync every student, in small batches, with a pause between
    batches so we stay well under the external API's rate limit.
    One student failing (bad username, timeout, 429) never stops
    the rest of the run.
*/
const syncAllStudents = async ({ force = false } = {}) => {

    // Stream documents via a cursor instead of loading the entire
    // collection into memory at once - keeps memory usage flat
    // regardless of how many students the university has.
    const cursor = LeetCodeStats.find({}).cursor();

    const results = [];
    let batch = [];
    let statsDoc = await cursor.next();

    while (statsDoc) {
        batch.push(statsDoc);

        if (batch.length === BATCH_SIZE) {
            const batchResults = await Promise.all(
                batch.map((doc) => syncStudentStats(doc, { force }))
            );
            results.push(...batchResults);
            batch = [];

            statsDoc = await cursor.next();

            if (statsDoc) {
                await sleep(DELAY_BETWEEN_BATCHES_MS);
            }
            continue;
        }

        statsDoc = await cursor.next();
    }

    if (batch.length > 0) {
        const batchResults = await Promise.all(
            batch.map((doc) => syncStudentStats(doc, { force }))
        );
        results.push(...batchResults);
    }

    const summary = {
        total: results.length,
        synced: results.filter((r) => r.status === "synced").length,
        skippedCached:
            results.filter((r) => r.status === "skipped-cached").length,
        failed: results.filter((r) => r.status === "failed").length
    };

    return {
        summary,
        failures: results.filter((r) => r.status === "failed")
    };
};

module.exports = {
    syncStudentStats,
    syncAllStudents
};
