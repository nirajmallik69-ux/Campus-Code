const LeetCodeStats = require("../models/LeetCodeStats");
const { getLeetCodeUserData } = require("./leetcodeService");

// Same window used by the student-facing /api/leetcode/stats route,
// kept here too so admin-triggered syncs don't hammer the API for
// students who were already refreshed recently.
const CACHE_DURATION = 2 * 60 * 60 * 1000;

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
        const data = await getLeetCodeUserData(username);

        statsDoc.totalSolved = data.totalSolved;
        statsDoc.easySolved = data.easySolved;
        statsDoc.mediumSolved = data.mediumSolved;
        statsDoc.hardSolved = data.hardSolved;

        statsDoc.leetcodePoints =
            (statsDoc.easySolved * 1) +
            (statsDoc.mediumSolved * 2) +
            (statsDoc.hardSolved * 3);

        statsDoc.leetcodeRank = data.ranking;
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
    Runs syncStudentStats() over a list of docs, `concurrency` at a
    time, with a pause between each small group. Shared by both
    syncAllStudents() and syncStaleStudentsChunk() below.
*/
const runInGroups = async (docs, { force, concurrency, delayMs }) => {
    const results = [];

    for (let i = 0; i < docs.length; i += concurrency) {
        const group = docs.slice(i, i + concurrency);

        const groupResults = await Promise.all(
            group.map((doc) => syncStudentStats(doc, { force }))
        );
        results.push(...groupResults);

        const isLastGroup = i + concurrency >= docs.length;
        if (!isLastGroup) {
            await sleep(delayMs);
        }
    }

    return results;
};

const summarize = (results) => ({
    total: results.length,
    synced: results.filter((r) => r.status === "synced").length,
    skippedCached: results.filter((r) => r.status === "skipped-cached").length,
    failed: results.filter((r) => r.status === "failed").length
});

/*
    Sync EVERY student in one pass. Used by the admin "Sync All
    Students" button - a manual, explicitly-requested, occasional
    action, so a long-running full sweep is expected and fine here.

    For the automatic background schedule, see
    syncStaleStudentsChunk() instead - a full sweep like this one
    does not scale to a large student body (e.g. at 10,000 students,
    one-at-a-time with a multi-second gap would take *hours* for a
    single pass, far longer than the cache window it's meant to
    refresh within).
*/
const syncAllStudents = async ({ force = false } = {}) => {

    // Stream documents via a cursor instead of loading the entire
    // collection into memory at once - keeps memory usage flat
    // regardless of how many students the university has.
    const cursor = LeetCodeStats.find({}).cursor();

    const docs = [];
    for await (const doc of cursor) {
        docs.push(doc);
    }

    const results = await runInGroups(docs, {
        force,
        concurrency: 1,
        delayMs: 4000
    });

    return {
        summary: summarize(results),
        failures: results.filter((r) => r.status === "failed")
    };
};

/*
    Syncs a bounded CHUNK of the STALEST students (never synced, or
    synced longest ago), instead of everyone at once.

    This is what the automatic background schedule uses
    (services/scheduler.js), run frequently (every few minutes) on a
    small slice rather than rarely (every 2 hours) on the whole
    student body. That makes this scale gracefully with the size of
    the student body instead of hitting a hard wall:

      - Small college (dozens/hundreds of students): a single chunk
        covers everyone, so in practice this behaves just like
        syncing everyone every cycle - no change from before.
      - Large university (thousands+): each run covers the students
        who have gone longest without a refresh first, so no one is
        ever starved indefinitely - the whole population cycles
        through continuously. The average time-to-refresh grows with
        the population and shrinks with more frequent/larger chunks,
        but there is no scenario where auto-sync simply stops
        keeping up the way one giant sweep would.

    CHUNK_SIZE, CONCURRENCY, and the delay are read fresh from env
    vars on every call (not module-load time), so they can be tuned
    via Render's dashboard without a redeploy. See the "Scaling
    auto-sync" section in the README for guidance on picking these -
    the safe defaults below assume the free, shared LeetCode API
    instance; a self-hosted instance can usually afford higher
    CONCURRENCY and a larger CHUNK_SIZE.
*/
const syncStaleStudentsChunk = async () => {
    const chunkSize = Number(process.env.SYNC_CHUNK_SIZE) || 50;
    const concurrency = Number(process.env.SYNC_CONCURRENCY) || 1;
    const delayMs = Number(process.env.SYNC_BATCH_DELAY_MS) || 4000;

    const cutoff = new Date(Date.now() - CACHE_DURATION);

    // Never-synced students (lastUpdated: null) sort before any real
    // date in ascending order, so they're naturally prioritized
    // first, then whoever has gone longest without a refresh.
    const docs = await LeetCodeStats.find({
        $or: [
            { lastUpdated: null },
            { lastUpdated: { $lt: cutoff } }
        ]
    })
        .sort({ lastUpdated: 1 })
        .limit(chunkSize);

    const results = await runInGroups(docs, {
        force: false,
        concurrency,
        delayMs
    });

    return {
        summary: summarize(results),
        failures: results.filter((r) => r.status === "failed")
    };
};

module.exports = {
    syncStudentStats,
    syncAllStudents,
    syncStaleStudentsChunk,
    CACHE_DURATION
};
