const LeetCodeStats = require("../models/LeetCodeStats");
const { getLeetCodeUserData } = require("./leetcodeService");

// How long a student's synced stats are considered "fresh" before
// they're eligible to be synced again. Configurable via env var
// (SYNC_CACHE_MINUTES) for later tuning, but left at the original
// 2 hours for now while the site is in testing - see the "Scaling
// auto-sync" section in the README when it's time to revisit this
// for production.
//
// Note: unlike SYNC_CHUNK_SIZE/SYNC_CONCURRENCY/SYNC_BATCH_DELAY_MS
// below (read fresh on every scheduled run), this value is fixed
// when the process starts - changing it on Render still takes
// effect immediately in practice, since saving an env var there
// triggers an automatic restart anyway.
const CACHE_DURATION = (Number(process.env.SYNC_CACHE_MINUTES) || 120) * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
    Sync one student's LeetCode stats.

    Pass `force: true` to ignore the cache window above (used when
    an admin explicitly re-syncs a single student).

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
    (services/scheduler.js), run every 2 hours on a small slice
    rather than rarely on the whole student body. That makes this
    scale gracefully with the size of the student body instead of
    hitting a hard wall:

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
    the defaults below are a deliberately moderate starting point,
    not the fastest technically possible, since LeetCode doesn't
    publish a rate limit for this endpoint to design against.
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
