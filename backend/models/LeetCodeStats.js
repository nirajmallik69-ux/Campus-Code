const mongoose = require("mongoose");

const leetCodeStatsSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },

        leetcodeUsername: {
            type: String,
            required: true,
            index: true,
            trim: true
        },

        totalSolved: {
            type: Number,
            default: 0,
            min: 0
        },

        easySolved: {
            type: Number,
            default: 0,
            min: 0
        },

        mediumSolved: {
            type: Number,
            default: 0,
            min: 0
        },

        hardSolved: {
            type: Number,
            default: 0,
            min: 0
        },

        leetcodePoints: {
            type: Number,
            default: 0,
            min: 0,
            index: true
        },

        contestRating: {
            type: Number,
            default: 0,
            min: 0
        },

        leetcodeRank: {
            type: Number,
            default: null
        },

        lastUpdated: {
            type: Date,
            default: null,
            index: true
        }
    }
);

const LeetCodeStats = mongoose.model(
    "LeetCodeStats",
    leetCodeStatsSchema
);

module.exports = LeetCodeStats;