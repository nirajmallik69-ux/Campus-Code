const axios = require("axios");

const BASE_URL = "https://alfa-leetcode-api.onrender.com";


const getLeetCodeStats = async (username) => {

    try {

        const response = await axios.get(
            `${BASE_URL}/${username}/solved`,
            {
                timeout: 10000
            }
        );

        return response.data;

    } catch (error) {

        if (error.response?.status === 429) {

            console.log(
                `LeetCode API rate limit reached for ${username}`
            );

            throw new Error(
                "LeetCode API rate limit reached. Please try again later."
            );
        }

        console.error(
            "Error fetching LeetCode stats:",
            error.message
        );

        throw new Error(
            "Failed to fetch LeetCode statistics."
        );
    }
};

const getLeetCodeProfile = async (username) => {

    try {

        const response = await axios.get(
            `${BASE_URL}/${username}`
        );

        return response.data;

    } catch (error) {

        console.error(
            "Error fetching LeetCode profile:",
            error.message
        );

        throw new Error(
            "Failed to fetch LeetCode profile."
        );
    }
};


module.exports = {
    getLeetCodeStats,
    getLeetCodeProfile
};