const mongoose = require('mongoose');
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    name: {
        type: String
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    }
});

UserSchema.methods.setPassword = async function (pass) {
    this.passwordHash = await bcrypt.hash(pass, 12);
};

UserSchema.methods.validatePassword = function (pass) {
    return bcrypt.compare(pass, this.passwordHash);
};

module.exports = mongoose.model("User", UserSchema);
