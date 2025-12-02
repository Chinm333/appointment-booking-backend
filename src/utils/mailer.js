const nodemailer = require("nodemailer");
const { DateTime } = require("luxon");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

const formatAppt = (startUtc, duration, timezone) => {
    const start = DateTime.fromJSDate(startUtc).setZone(timezone);
    const end = start.plus({ minutes: duration });

    return {
        startLabel: start.toFormat("cccc, d LLLL yyyy 'at' h:mm a"),
        endLabel: end.toFormat("h:mm a"),
        tzName: start.offsetNameLong
    };
};


const sendBookingConfirmation = async ({ to, appointment, timezone }) => {
    const { startUtc, durationMinutes, name, email, reason } = appointment;

    const fmt = formatAppt(startUtc, durationMinutes, timezone);

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2563eb;">Appointment Confirmed</h2>

            <p>Hello ${name},</p>

            <p>Your appointment has been successfully scheduled.</p>

            <h3 style="margin-top: 20px;">📅 Appointment Details</h3>
            <table style="margin-top: 10px;">
                <tr>
                    <td style="padding: 5px 10px; font-weight: bold;">Date:</td>
                    <td>${fmt.startLabel} (${fmt.tzName})</td>
                </tr>
                <tr>
                    <td style="padding: 5px 10px; font-weight: bold;">Duration:</td>
                    <td>${durationMinutes} minutes</td>
                </tr>
                <tr>
                    <td style="padding: 5px 10px; font-weight: bold;">Ends at:</td>
                    <td>${fmt.endLabel}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 10px; font-weight: bold;">Reason:</td>
                    <td>${reason || "Not provided"}</td>
                </tr>
            </table>

            <p style="margin-top: 20px;">
                If you need to make changes or cancel this appointment, please contact us.
            </p>

            <p style="margin-top: 30px;">Regards,<br/>
            Appointment Scheduler System</p>
        </div>
    `;

    return transporter.sendMail({
        to,
        subject: "Your Appointment is Confirmed",
        html
    });
};


const sendReminder = async ({ to, appointment, timezone }) => {
    const { startUtc, durationMinutes, name, reason } = appointment;

    const fmt = formatAppt(startUtc, durationMinutes, timezone);

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #d97706;">Appointment Reminder</h2>

            <p>Hello ${name},</p>

            <p>This is a reminder for your upcoming appointment.</p>

            <h3 style="margin-top: 20px;">📅 Appointment Details</h3>
            <table style="margin-top: 10px;">
                <tr>
                    <td style="padding: 5px 10px; font-weight: bold;">Date:</td>
                    <td>${fmt.startLabel} (${fmt.tzName})</td>
                </tr>
                <tr>
                    <td style="padding: 5px 10px; font-weight: bold;">Duration:</td>
                    <td>${durationMinutes} minutes</td>
                </tr>
                <tr>
                    <td style="padding: 5px 10px; font-weight: bold;">Ends at:</td>
                    <td>${fmt.endLabel}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 10px; font-weight: bold;">Reason:</td>
                    <td>${reason || "Not provided"}</td>
                </tr>
            </table>

            <p style="margin-top: 20px;">Please be prepared on time.</p>

            <p style="margin-top: 30px;">Regards,<br/>
            Appointment Scheduler System</p>
        </div>
    `;

    return transporter.sendMail({
        to,
        subject: "Upcoming Appointment Reminder",
        html
    });
};


module.exports = { sendBookingConfirmation, sendReminder };