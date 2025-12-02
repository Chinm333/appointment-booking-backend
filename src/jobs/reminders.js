const cron = require("node-cron");
const Appointment = require("../models/Appointment");
const mailer = require("../utils/mailer");
const { DateTime } = require("luxon");

const start = () => {
    cron.schedule(process.env.REMINDER_CRON, async () => {
        const now = DateTime.utc();
        const in24 = now.plus({ hours: 24 });
        const appointments = await Appointment.find({
            startUtc: {
                $gte: in24.minus({ minutes: 15 }).toJSDate(),
                $lt: in24.plus({ minutes: 15 }).toJSDate()
            }
        }).lean();
        for (const a of appointments) {
            await mailer.sendReminder({ to: a.email, appointment: a, timezone: a.timezone });
        }
    });
}

module.exports = { start };