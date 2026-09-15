const cron = require("node-cron");
const { syncStaleStudentsChunk } = require("./syncService");
const { runYearProgression } = require("./yearProgressionService");

/*
    Automatically keeps LeetCode stats fresh in the background, so
    students don't have to manually click "Sync LeetCode" and admins
    don't have to manually trigger "Sync All Students."

    Uses node-cron only - a single in-process scheduled function call,
    not a job queue or separate worker. This keeps the "simple,
    reliable implementation for a college project" approach used
    everywhere else in this backend, while still scaling to a large
    student body - see syncStaleStudentsChunk()'s own comments in
    syncService.js for how.

    Runs every 2 hours, syncing a bounded CHUNK of the stalest
    students each time, rather than the whole student body in one
    go. For a small college this behaves the same as before in
    practice (one run covers everyone). For a large university it
    scales gracefully instead of hitting a wall: see the "Scaling
    auto-sync" section in the README - that's also where to look
    when it's time to tune this for production; for now, during
    testing, this interval is left at the original 2 hours.

    IMPORTANT: this only runs while the Node process itself is
    running. On Render's free tier the service spins down after ~15
    minutes of no incoming HTTP traffic - while it's asleep, nothing
    here can fire at all, no matter how the schedule is written. This
    is also why a run happens immediately on startup below - it
    covers every wake-up, not just ones that happen to land exactly
    on a 2-hour boundary. Pair this with an uptime pinger (e.g.
    UptimeRobot hitting the site's base URL every 5-10 minutes) so
    the process is actually awake often enough for this to matter.
*/

// Guards against two runs overlapping if one happens to take longer
// than 2 hours (e.g. a slow LeetCode API response, or a large
// CHUNK_SIZE) - without this, a slow run and the next scheduled tick
// could both hit the database and the LeetCode API at the same time.
let isSyncRunning = false;

const runSync = async (trigger) => {
    if (isSyncRunning) {
        console.log(`[auto-sync] Skipping ${trigger} run - a previous sync is still in progress.`);
        return;
    }

    isSyncRunning = true;
    console.log(`[auto-sync] Starting ${trigger} sync chunk...`);

    try {
        const { summary } = await syncStaleStudentsChunk();
        console.log(
            `[auto-sync] Done (${trigger}) - ${summary.synced} synced, ` +
            `${summary.skippedCached} already up to date, ` +
            `${summary.failed} failed (out of ${summary.total} in this chunk).`
        );
    } catch (error) {
        console.error(`[auto-sync] ${trigger} sync failed:`, error);
    } finally {
        isSyncRunning = false;
    }
};

/*
    Yearly student progression: promotes Year 1-3 students whose year
    hasn't been touched in over a year, and permanently removes
    Year 4 students one year after they became Year 4 (graduation).
    See yearProgressionService.js for the full reasoning, including
    the safety step that prevents this from mass-affecting existing
    students the first time it ever runs.

    Runs once daily - this is a "once a year, per student" concern,
    so daily granularity is more than precise enough, unlike the
    LeetCode sync above which genuinely benefits from running often.
    Also runs once on startup for the same free-tier-sleep reason as
    the sync job above - a once-daily-only schedule could otherwise
    go days without firing if the app happens to be asleep every time
    the scheduled tick comes around.
*/
let isYearJobRunning = false;

const runYearJob = async (trigger) => {
    if (isYearJobRunning) {
        console.log(`[year-progression] Skipping ${trigger} run - a previous run is still in progress.`);
        return;
    }

    isYearJobRunning = true;
    console.log(`[year-progression] Starting ${trigger} run...`);

    try {
        const { promoted, removed } = await runYearProgression();
        console.log(
            `[year-progression] Done (${trigger}) - ${promoted} student(s) promoted, ` +
            `${removed} student(s) graduated and removed.`
        );
    } catch (error) {
        console.error(`[year-progression] ${trigger} run failed:`, error);
    } finally {
        isYearJobRunning = false;
    }
};

const startSchedules = () => {
    // Catch up immediately on startup - covers every wake-up, not
    // just ones that happen to land on an exact scheduled boundary.
    runSync("startup");
    runYearJob("startup");

    // LeetCode sync: every 2 hours.
    cron.schedule("0 */2 * * *", () => runSync("scheduled"));

    // Year progression: once daily at 03:15 (a quiet time, and
    // deliberately offset from the sync job's exact-hour ticks so
    // the two never fire in the same instant).
    cron.schedule("15 3 * * *", () => runYearJob("scheduled"));

    console.log("[auto-sync] Armed: once now, then every 2 hours.");
    console.log("[year-progression] Armed: once now, then daily at 03:15.");
};

module.exports = startSchedules;
