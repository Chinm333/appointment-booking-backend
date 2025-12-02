const { DateTime } = require("luxon");

const generateWeekSlots = (weekStartISO, timezone) => {
    const start = DateTime.fromISO(weekStartISO, { zone: timezone }).startOf("week").plus({ days: 1 });
    const slots = [];

    for (let d = 0; d < 5; d++) {
        const day = start.plus({ days: d });
        for (let h = 9; h <= 16; h++) {
            for (let m of [0, 30]) {
                const local = day.set({ hour: h, minute: m });
                const utc = local.toUTC();
                slots.push({
                    day: local.toISODate(),
                    time: local.toFormat("HH:mm"),
                    startLocalISO: local.toISO(),
                    startUtcISO: utc.toISO()
                });
            }
        }
    }
    return slots;
};

const isValidBusinessSlot = (iso, timezone) => {
    const date = DateTime.fromISO(iso, { zone: timezone });
    if (!date.isValid) return false;
    if (date.weekday < 1 || date.weekday > 5) return false;
    if (date.hour < 9 || date.hour > 16) return false;
    if (![0, 30].includes(date.minute)) return false;
    return true;
};

module.exports = { generateWeekSlots, isValidBusinessSlot };
