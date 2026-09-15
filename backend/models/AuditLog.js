const mongoose = require("mongoose");

/*
    Records every admin action that changes data (edit student,
    delete student, sync-all), plus automated system actions (the
    yearly year-progression job). Read-only from the API's
    perspective - nothing ever updates or deletes an existing entry.

    This exists for accountability at scale: once more than one
    admin has access, "who changed this student's year, and when"
    needs an answer that doesn't rely on someone remembering.
*/
const auditLogSchema = new mongoose.Schema(
    {
        actorType: {
            type: String,
            enum: ["admin", "system"],
            required: true
        },

        // Populated for actorType "admin" - null for automated
        // system actions like the year-progression job.
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        actorName: {
            type: String,
            default: "System"
        },

        action: {
            type: String,
            required: true
        },

        targetType: {
            type: String,
            default: null
        },

        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        // Free-form details specific to the action (e.g. which
        // fields changed, sync summary counts, etc.)
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        createdAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
