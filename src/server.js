require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/auth");
const appointmentsRoutes = require("./routes/appointments");
const remindersJob = require("./jobs/reminders");

app.use(cors());
app.use(bodyParser.json());

app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentsRoutes);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Database connected successfully!"))
        .catch(e => {
            console.error(e); process.exit(1);
        });

app.get('/', (req, res) => res.send("Appointment Booking API OK"));
remindersJob.start();

app.listen(process.env.PORT, () => {
    console.log(`Server started on port ${process.env.PORT}`);
});