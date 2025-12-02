const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const auth = (requiredRole = null) => {
    return (req, res, next) => {
        const header = req.headers.authorization;
        if (!header) {
            return res.status(401).json({ message: "No header, unauthorized" });
        }

        const token = header.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "No token, unauthorized" });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: "Invalid token" });
            }

            req.user = decoded;

            if (requiredRole && decoded.role !== requiredRole) {
                return res.status(403).json({ message: "Forbidden: wrong role" });
            }

            next();
        });
    };
};

module.exports = auth;
