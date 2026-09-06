const User = require("../models/User");
const asyncHandler = require("./asyncHandler");

/*
    requireAdmin

    Must run AFTER authenticateToken.

    We do NOT trust req.user.role (the JWT only carries userId/email).
    We look the user up fresh in the database so a stale or tampered
    token can never grant admin access - role is only ever changed
    directly in the database by a trusted operator.

    Unauthenticated  -> authenticateToken already returns 401
    Authenticated, not admin -> 403
    Authenticated admin -> next()
*/
const requireAdmin = asyncHandler(async (req, res, next) => {

    if (!req.user || !req.user.userId) {
        return res.status(401).json({
            message: "Access token required."
        });
    }

    const user = await User.findById(req.user.userId).select("role");

    if (!user) {
        return res.status(401).json({
            message: "User not found."
        });
    }

    if (user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access required."
        });
    }

    // Attach the trusted role so downstream handlers don't need
    // to re-query if they want it.
    req.user.role = user.role;

    next();
});

module.exports = requireAdmin;
