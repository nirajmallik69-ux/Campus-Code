const jwt = require("jsonwebtoken");

//Authentication middleware to verify JWT token

const authenticateToken = (req, res, next) => {

    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access token required."
        });
    }

    try {

        const user = jwt.verify(token, process.env.JWT_SECRET);

        req.user = user;

        next();

    } catch (error) {

        return res.status(403).json({
            message: "Invalid or expired token."
        });

    }
};

module.exports = authenticateToken;