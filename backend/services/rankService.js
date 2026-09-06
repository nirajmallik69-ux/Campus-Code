const LeetCodeStats = require("../models/LeetCodeStats");

/*
    Counts how many students rank strictly ahead of the given
    student, using the same tiebreak rule as the leaderboard sort:

        1. higher leetcodePoints
        2. same points -> name A-Z (case-insensitive)
        3. same points + same name -> sicId A-Z

    Pass `year` to scope the count to a single year (year rank).
    Returns the 1-based rank (studentsAhead + 1).

    This is the single source of truth for rank calculation - used
    by the public student profile, the leaderboard /me endpoint, and
    the student dashboard - so the tiebreak rule only ever lives in
    one place.
*/
const getRankAhead = async (stats, user, { year = null } = {}) => {

    const matchStage = {
        $or: [
            { leetcodePoints: { $gt: stats.leetcodePoints } },
            {
                leetcodePoints: stats.leetcodePoints,
                "user.name": { $lt: user.name }
            },
            {
                leetcodePoints: stats.leetcodePoints,
                "user.name": user.name,
                "user.sicId": { $lt: user.sicId }
            }
        ]
    };

    if (year !== null) {
        matchStage["user.year"] = year;
    }

    const result = await LeetCodeStats.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: "$user" },
        { $match: matchStage },
        { $count: "count" }
    ]).collation({ locale: "en", strength: 2 });

    return (result[0]?.count || 0) + 1;
};

const getCampusRank = (stats, user) => getRankAhead(stats, user);

const getYearRank = (stats, user) =>
    getRankAhead(stats, user, { year: user.year });

module.exports = { getCampusRank, getYearRank };
