const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

router.post("/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and Password are required" });
    }
    const user = await User.findOne({ email });
    if (user) {
        return res.status(400).json({ message: "Email already exists" });
    }
    const newUser = new User({ email, password, name });
    await newUser.setPassword(password);
    await newUser.save();
    const token = jwt.sign({
        sub: newUser._id,
        role: newUser.role,
        email: newUser.email
    }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(201).json({
        token,
        user: {
            id: newUser._id,
            email: newUser.email,
            role: newUser.role
        }
    });
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }
    const isValid = await user.validatePassword(password);
    if (!isValid) {
        return res.status(400).json({ message: "Invalid Password" });
    }
    const token = jwt.sign({
        sub: user._id,
        role: user.role,
        email: user.email
    }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(200).json({
        token,
        user: {
            id: user._id,
            email: user.email,
            role: user.role
        }
    });
});

module.exports = router;