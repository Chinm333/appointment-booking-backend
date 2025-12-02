const mongoose = require("mongoose");

const RecurringSchema = new mongoose.Schema({
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    timezone: {
        type: String
    },
    startLocalISO: {
        type: String
    },
    frequency: {
        type: String,
        enum: ["weekly", "biweekly", "monthly"]
    },
    occurrences: {
        type: Number
    },
    endDateISO: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Recurring", RecurringSchema);