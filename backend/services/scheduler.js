const cron = require("node-cron");
const { syncAllStudents } = require("./syncService");

/*
    Runs syncAllStudents() automatically on a schedule, so students
    don't have to manually click "Sync LeetCode" and admins don't
    have to manually trigger "Sync All Students" for the leaderboard
    to stay current.

    Uses node-cron only - a single in-process scheduled function call,
    not a job queue or separate worker. This keeps the "simple,
    reliable implementation for a college project" approach used
    everywhere else in this backend.

    IMPORTANT: this only runs while the Node process itself is
    running. On Render's free tier the service spins down after ~15
    minutes of no incoming HTTP traffic - while it's asleep, this
    schedule does not fire (there's no process to run it). Pairing
    this with an uptime pinger (e.g. UptimeRobot hitting the site's
    base URL every 5-10 minutes) keeps the process alive so this
    actually runs reliably, not just when someone happens to visit.

    syncAllStudents() is safe to call this often: it calls
    syncStudentStats() per-student, which checks that student's own
    cache first and skips anyone already refreshed within the last
    CACHE_DURATION - so an already-current student costs nothing
    extra, only genuinely stale students trigger a real LeetCode API
    call.
*/
const startAutoSyncSchedule = () => {
    // Every 2 hours, on the hour - matches CACHE_DURATION in
    // syncService.js. If you change one, change the other.
    cron.schedule("0 */2 * * *", async () => {
        console.log("[auto-sync] Starting scheduled LeetCode sync for all students...");

        try {
            const { summary } = await syncAllStudents({ force: false });
            console.log(
                `[auto-sync] Done - ${summary.synced} synced, ` +
                `${summary.skippedCached} already up to date, ` +
                `${summary.failed} failed (out of ${summary.total} total).`
            );
        } catch (error) {
            console.error("[auto-sync] Scheduled sync failed:", error);
        }
    });

    console.log("[auto-sync] Scheduled LeetCode auto-sync every 2 hours.");
};

module.exports = startAutoSyncSchedule;
