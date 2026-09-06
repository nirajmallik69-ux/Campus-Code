const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: false,
            trim: true,
            index: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        sicId: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
            uppercase: true,
            trim: true
        },

        year: {
            type: Number,
            required: false,
            min: 1,
            max: 4
        },

        whatsappNumber: {
            type: String,
            required: false,
            trim: true
        },

        leetcodeUsername: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
            trim: true
        },

        profilePicture: {
            type: String,
            default: null
        },

        profilePicturePublicId: {
            type: String,
            default: null
        },

        role: {
            type: String,
            enum: ["student", "admin"],
            default: "student"
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;