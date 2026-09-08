const axios = require("axios");

/*
    Queries LeetCode's own GraphQL endpoint directly - no third-party
    wrapper service in between at all.

    WHY THIS CHANGED: this app previously went through
    alfa-leetcode-api.onrender.com, a free, community-run, shared
    wrapper service. Its own rate limit (shared across every
    unrelated project using it, not just this app) is what caused
    production sync failures (429 Too Many Requests) even at a
    handful of students. Calling LeetCode's own endpoint removes that
    specific bottleneck entirely - our effective ceiling is now
    whatever LeetCode's own infrastructure tolerates for a single
    consistent caller, not a small free hobby service's protective
    self-throttle shared with strangers. It also cuts requests in
    half: one combined query gets both solved counts and rank,
    instead of two separate calls to two separate endpoints.

    HONESTY CHECK: this is still not an official, published LeetCode
    API - LeetCode does not offer one for this data. This query shape
    (matchedUser / submitStatsGlobal / profile.ranking) is simply
    what LeetCode's own website frontend itself calls, reverse-
    engineered and used by many independent open-source tools for
    years. It is more reliable than routing through a shared
    third-party proxy, but it carries the same category of risk any
    unofficial API integration does: LeetCode could change this
    schema, or restrict access to it, without notice. If sync stops
    working outright (not just occasional rate-limiting) after a
    LeetCode site update, this is the first place to check.
*/

const GRAPHQL_URL = "https://leetcode.com/graphql";

const QUERY = `
    query getUserProfile($username: String!) {
        matchedUser(username: $username) {
            username
            profile {
                ranking
            }
            submitStats: submitStatsGlobal {
                acSubmissionNum {
                    difficulty
                    count
                }
            }
        }
    }
`;

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 3000; // waits are 3s, then 6s

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runQuery = async (username) => {
    let lastError;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const response = await axios.post(
                GRAPHQL_URL,
                {
                    query: QUERY,
                    variables: { username }
                },
                {
                    timeout: 10000,
                    headers: {
                        "Content-Type": "application/json",
                        // LeetCode's GraphQL endpoint expects requests to
                        // look like they came from a browser tab on the
                        // site - a realistic Referer/User-Agent avoids
                        // being blocked as obvious bot traffic.
                        "Referer": `https://leetcode.com/u/${username}/`,
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                    }
                }
            );

            return response.data;

        } catch (error) {
            lastError = error;

            const isRateLimited = error.response?.status === 429;
            const hasAttemptsLeft = attempt < MAX_ATTEMPTS;

            if (isRateLimited && hasAttemptsLeft) {
                const delay = RETRY_BASE_DELAY_MS * attempt;
                console.log(
                    `LeetCode GraphQL rate limited for ${username} ` +
                    `(attempt ${attempt}/${MAX_ATTEMPTS}) - retrying in ${delay}ms`
                );
                await sleep(delay);
                continue;
            }

            throw error;
        }
    }

    throw lastError;
};

/*
    Returns { totalSolved, easySolved, mediumSolved, hardSolved, ranking }
    for a LeetCode username in a single request, or throws if the
    username doesn't exist or the request ultimately fails.
*/
const getLeetCodeUserData = async (username) => {

    let payload;

    try {
        payload = await runQuery(username);
    } catch (error) {

        if (error.response?.status === 429) {
            console.log(`LeetCode API rate limit reached for ${username}`);
            throw new Error("LeetCode API rate limit reached. Please try again later.");
        }

        console.error(`Error fetching LeetCode data for ${username}:`, error.message);
        throw new Error("Failed to fetch LeetCode statistics.");
    }

    const matchedUser = payload?.data?.matchedUser;

    if (!matchedUser) {
        throw new Error(`LeetCode username "${username}" was not found.`);
    }

    const counts = Object.fromEntries(
        (matchedUser.submitStats?.acSubmissionNum || []).map((row) => [row.difficulty, row.count])
    );

    return {
        totalSolved: counts.All || 0,
        easySolved: counts.Easy || 0,
        mediumSolved: counts.Medium || 0,
        hardSolved: counts.Hard || 0,
        ranking: matchedUser.profile?.ranking ?? null
    };
};

module.exports = {
    getLeetCodeUserData
};
