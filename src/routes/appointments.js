const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const Recurring = require("../models/Recurring");
const { generateWeekSlots, isValidBusinessSlot } = require("../utils/slots");
const { DateTime } = require("luxon");
const auth = require("../middleware/auth");
const mailer = require("../utils/mailer");
const mongoose = require("mongoose");

router.get("/", auth(), async (req, res) => {
    const { q, email, from, to, page = 1, limit = 50 } = req.query;
    const flt = {};
    if (email) flt.email = email;
    if (from || to) {
        flt.startUtc = {};
        if (from) flt.startUtc.$gte = DateTime.fromISO(from).startOf("day").toJSDate();
        if (to) flt.startUtc.$lte = DateTime.fromISO(to).endOf("day").toJSDate();
    }
    if (q) {
        const rx = new RegExp(q, "i");
        flt.$or = [{ name: rx }, { email: rx }, { reason: rx }];
    }
    const docs = await Appointment.find(flt).sort({ startUtc: 1 }).skip((page - 1) * limit).limit(Number(limit)).lean();
    const total = await Appointment.countDocuments(flt);
    res.status(200).json({ docs, total });
});

router.get("/available", async (req, res) => {
    const { weekStart, tz } = req.query;
    const timezone = tz || "UTC";
    if (!weekStart) {
        return res.status(400).json({ message: "weekStart required" });
    }
    const slots = generateWeekSlots(weekStart, timezone);
    const startUtcList = slots.map(s => new Date(s.startUtcISO));
    const booked = await Appointment.find({
        startUtc: { $gte: startUtcList[0], $lte: startUtcList.at(-1) }
    }).lean();
    const bookedRanges = booked.map(b => ({
        start: DateTime.fromJSDate(b.startUtc),
        end: DateTime.fromJSDate(b.startUtc).plus({ minutes: b.durationMinutes })
    }));
    const nowLocal = DateTime.now().setZone(timezone);
    const today = nowLocal.startOf("day");

    const available = slots.filter(s => {
        const localStart = DateTime.fromISO(s.startLocalISO, { zone: timezone });
        const localEnd = localStart.plus({ minutes: 30 });
        if (localStart.hasSame(today, "day") && localStart < nowLocal) {
            return false;
        }
        for (const br of bookedRanges) {
            const brLocalStart = br.start.setZone(timezone);
            const brLocalEnd = br.end.setZone(timezone);
            if (localStart < brLocalEnd && localEnd > brLocalStart) {
                return false;
            }
        }
        return true;
    });

    res.json(available);
});

router.post("/", auth(), async (req, res) => {
    const { startUtc, startLocal, timezone, name, email, phone, reason, durationMinutes } = req.body;

    if (!startUtc || !name || !email)
        return res.status(400).json({ message: "Missing fields" });

    const zone = timezone || "UTC";
    const localDt = startLocal
        ? DateTime.fromISO(startLocal, { zone: zone })
        : DateTime.fromISO(startUtc, { zone: "utc" }).setZone(zone);

    const utcDt = DateTime.fromISO(startUtc, { zone: "utc" });
    if (utcDt < DateTime.utc())
        return res.status(400).json({ message: "Past" });

    if (!isValidBusinessSlot(localDt.toISO(), zone))
        return res.status(400).json({ message: "Invalid slot" });

    const doc = new Appointment({
        startUtc: utcDt.toJSDate(),
        name, email, phone, reason, durationMinutes
    });

    try {
        const saved = await doc.save();
        mailer.sendBookingConfirmation({ to: email, appointment: saved, timezone: zone })
            .catch(console.error);

        res.status(201).json(saved);
    } catch (e) {
        if (e.code === 11000) return res.status(409).json({ message: "Slot taken" });
        console.error(e);
        res.status(500).json({ message: "Error" });
    }
});

router.put("/:id", auth(), async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json({ message: "Invalid id" });

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Not found" });

    const { startUtc, startLocal, timezone, name, email, phone, reason, durationMinutes } = req.body;

    if (startUtc) {
        const zone = timezone || "UTC";
        const localDt = startLocal
            ? DateTime.fromISO(startLocal, { zone: zone })
            : DateTime.fromISO(startUtc, { zone: "utc" }).setZone(zone);

        if (!isValidBusinessSlot(localDt.toISO(), zone))
            return res.status(400).json({ message: "Invalid slot" });

        const utc = DateTime.fromISO(startUtc);
        if (utc < DateTime.utc())
            return res.status(400).json({ message: "Past" });

        appt.startUtc = utc.toJSDate();
    }

    if (name !== undefined) appt.name = name;
    if (email !== undefined) appt.email = email;
    if (phone !== undefined) appt.phone = phone;
    if (reason !== undefined) appt.reason = reason;
    if (durationMinutes !== undefined) appt.durationMinutes = durationMinutes;

    try {
        const saved = await appt.save();
        res.json(saved);
    } catch (e) {
        if (e.code === 11000)
            return res.status(409).json({ message: "Slot taken" });
        res.status(500).json({ message: "Error updating" });
    }
});

router.delete("/:id", auth(), async (req, res) => {
    const { id } = req.params;
    const out = await Appointment.findByIdAndDelete(id);
    if (!out) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
});

router.post("/recurring", auth(), async (req, res) => {
    const { startLocalISO, timezone, frequency, occurrences = 1 } = req.body;

    const rec = new Recurring({
        creatorId: req.user.sub,
        startLocalISO,
        timezone,
        frequency,
        occurrences,
    });

    await rec.save();

    let cursor = DateTime.fromISO(startLocalISO, { zone: timezone });
    const created = [];

    for (let i = 0; i < occurrences; i++) {
        const utcISO = cursor.toUTC().toISO();

        try {
            const a = new Appointment({
                startUtc: cursor.toUTC().toJSDate(),
                name: "Recurring",
                email: req.user.email,
                reason: `Recurring series ${rec._id}`
            });
            await a.save();
            created.push(a);
        } catch (e) {
            if (e.code !== 11000) console.error(e);
        }

        if (frequency === "weekly") cursor = cursor.plus({ weeks: 1 });
        if (frequency === "biweekly") cursor = cursor.plus({ weeks: 2 });
        if (frequency === "monthly") cursor = cursor.plus({ months: 1 });
    }

    res.status(201).json({ recurringId: rec._id, createdCount: created.length });
});

module.exports = router;