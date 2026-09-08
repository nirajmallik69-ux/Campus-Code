const cron = require("node-cron");
const { syncAllStudents } = require("./syncService");

/*
    Runs syncAllStudents() automatically, so students don't have to
    manually click "Sync LeetCode" and admins don't have to manually
    trigger "Sync All Students" for the leaderboard to stay current.

    Uses node-cron only - a single in-process scheduled function call,
    not a job queue or separate worker. This keeps the "simple,
    reliable implementation for a college project" approach used
    everywhere else in this backend.

    IMPORTANT: this only runs while the Node process itself is
    running. On Render's free tier the service spins down after ~15
    minutes of no incoming HTTP traffic - while it's asleep, nothing
    here can fire at all, no matter how the schedule is written.

    A plain "every 2 hours on the clock" cron schedule alone is not
    reliable on a host that sleeps: if the process happens to be
    asleep at the exact moment a 2-hour boundary (2:00, 4:00, ...)
    ticks over, that run is simply skipped, and the next chance is
    another 2 hours away - which might also be missed. On a free
    instance with sporadic traffic, this can mean auto-sync barely
    runs at all even though the schedule is technically armed.

    To make this actually reliable in practice, this module does TWO
    things instead of just one:
      1. Runs a sync immediately, once, whenever the server starts up
         (i.e. every time the app wakes from sleep for any reason -
         a real visitor, an uptime pinger, a redeploy, etc).
      2. Also schedules the recurring every-2-hours job, which keeps
         things fresh for as long as the process happens to stay
         awake in between.

    syncAllStudents() is safe to call this often: it calls
    syncStudentStats() per-student, which checks that student's own
    cache first and skips anyone already refreshed within the last
    CACHE_DURATION - so an already-current student costs nothing
    extra, only genuinely stale students trigger a real LeetCode API
    call. Running it an "extra" time on startup will not double-sync
    anyone or hit LeetCode's API any harder than necessary.

    Still pair this with an uptime pinger (e.g. UptimeRobot hitting
    the site's base URL every 5-10 minutes) - the more often the app
    is awake, the more often BOTH the startup run and the 2-hour
    schedule actually get a chance to fire.
*/

const runSync = async (trigger) => {
    console.log(`[auto-sync] Starting ${trigger} LeetCode sync for all students...`);

    try {
        const { summary } = await syncAllStudents({ force: false });
        console.log(
            `[auto-sync] Done (${trigger}) - ${summary.synced} synced, ` +
            `${summary.skippedCached} already up to date, ` +
            `${summary.failed} failed (out of ${summary.total} total).`
        );
    } catch (error) {
        console.error(`[auto-sync] ${trigger} sync failed:`, error);
    }
};

const startAutoSyncSchedule = () => {
    // 1. Catch up immediately on startup - covers every wake-up,
    // not just ones that happen to land on an exact hour boundary.
    runSync("startup");

    // 2. Every 2 hours, on the hour, for as long as the process
    // stays awake in between. Matches CACHE_DURATION in
    // syncService.js - if you change one, change the other.
    cron.schedule("0 */2 * * *", () => runSync("scheduled"));

    console.log("[auto-sync] Auto-sync armed: once now, then every 2 hours.");
};

module.exports = startAutoSyncSchedule;
