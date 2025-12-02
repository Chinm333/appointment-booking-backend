const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema({
    startUtc: {
        type: Date,
        required: true,
        unique: true,
        index: true
    },
    durationMinutes: {
        type: Number,
        default: 30
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    reason: {
        type: String,
        maxlength: 300
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
});

module.exports = mongoose.model("Appointment", AppointmentSchema);