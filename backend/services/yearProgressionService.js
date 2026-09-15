const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { permanentlyDeleteStudent } = require("./accountService");

// Defaults to 365 days (a real year). Override with
// YEAR_PROGRESSION_DAYS to test this feature without waiting a
// literal year - e.g. set it to 1 in a test environment, create a
// test student, manually backdate their yearUpdatedAt in MongoDB to
// more than a day ago, then trigger a run and confirm they get
// promoted/removed as expected. Set it back to 365 (or just remove
// the env var) before relying on this in production.
const PROGRESSION_DAYS = Number(process.env.YEAR_PROGRESSION_DAYS) || 365;
const PROGRESSION_MS = PROGRESSION_DAYS * 24 * 60 * 60 * 1000;

/*
    Runs the yearly student progression:

      1. Any student in Year 1-3 whose year hasn't been touched in
         over a year gets promoted to the next year, and their
         "clock" resets from that moment.
      2. Any student in Year 4 whose year hasn't been touched in
         over a year (i.e. one year after becoming a 4th-year) is
         treated as graduated and permanently deleted - matching the
         explicit decision to hard-delete rather than archive, since
         every kept document has a real cost on a free-tier database.

    Manually changing a student's year (by the student themselves,
    or an admin) resets this clock too - see the yearUpdatedAt
    updates in routes/authRoutes.js and routes/adminRoutes.js.

    ---------------------------------------------------------------
    CRITICAL SAFETY STEP - read before changing this function:

    yearUpdatedAt did not exist before this feature shipped, so
    every student created before today has it set to null. A naive
    query like `yearUpdatedAt: { $lte: cutoff }` would ALSO match
    documents where the field is null (MongoDB's BSON comparison
    order treats null as less than any date), which would mean
    every single existing student gets promoted or deleted the very
    first time this job runs after deploy. That would be a
    catastrophic, silent mistake.

    To prevent that, this function backfills any null yearUpdatedAt
    to right now BEFORE running the promotion/deletion queries, on
    every run. This means existing students effectively start their
    one-year clock today rather than on whatever their real year
    actually started - the safest assumption available, since the
    real date isn't known. It also means the explicit
    `{ $ne: null }` guard below is technically redundant after the
    first run, but it costs nothing to keep as a second line of
    defense against the same class of bug ever recurring.
    ---------------------------------------------------------------
*/
const runYearProgression = async () => {

    await User.updateMany(
        { role: "student", yearUpdatedAt: null },
        { $set: { yearUpdatedAt: new Date() } }
    );

    const cutoff = new Date(Date.now() - PROGRESSION_MS);

    // ---- Promote Year 1-3 students past their one-year mark ----

    const promotable = await User.find({
        role: "student",
        year: { $gte: 1, $lt: 4 },
        yearUpdatedAt: { $ne: null, $lte: cutoff }
    });

    let promoted = 0;

    for (const user of promotable) {
        const fromYear = user.year;
        user.year += 1;
        user.yearUpdatedAt = new Date();

        try {
            await user.save();
            promoted += 1;

            await AuditLog.create({
                actorType: "system",
                actorName: "System",
                action: "year_promoted",
                targetType: "User",
                targetId: user._id,
                details: {
                    name: user.name,
                    sicId: user.sicId,
                    fromYear,
                    toYear: user.year
                }
            });
        } catch (error) {
            console.error(`[year-progression] Failed to promote ${user.sicId || user._id}:`, error.message);
        }
    }

    // ---- Graduate (permanently delete) Year 4 students past their one-year mark ----

    const graduating = await User.find({
        role: "student",
        year: 4,
        yearUpdatedAt: { $ne: null, $lte: cutoff }
    });

    let removed = 0;

    for (const user of graduating) {
        const record = {
            name: user.name,
            sicId: user.sicId,
            email: user.email,
            year: user.year
        };

        try {
            await permanentlyDeleteStudent(user);
            removed += 1;

            await AuditLog.create({
                actorType: "system",
                actorName: "System",
                action: "year_graduated_deleted",
                targetType: "User",
                targetId: user._id,
                details: record
            });
        } catch (error) {
            console.error(`[year-progression] Failed to graduate ${record.sicId || record.email}:`, error.message);
        }
    }

    return { promoted, removed };
};

module.exports = { runYearProgression };
