require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const leetcodeRoutes = require("./routes/leetcodeRoutes");
const errorHandler = require("./middleware/errorHandler");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const startAutoSyncSchedule = require("./services/scheduler");

const app = express();

const PORT = process.env.PORT || 5000;

// Render/Railway/Vercel/Heroku/etc. all put the app behind a reverse
// proxy. Without this, every request looks like it comes from the
// proxy's IP, which breaks express-rate-limit's per-IP counting (it
// would rate-limit "everyone" as a single caller).
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(helmet());

// A generous, sitewide baseline limiter. The stricter, purpose-built
// OTP limiter in routes/authRoutes.js still applies on top of this
// for the /send-otp endpoint specifically.
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
});
app.use(globalLimiter);

const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5173",
];

// Allow the production frontend URL to be configured via env var.
// FRONTEND_URL may be a single origin or a comma-separated list of origins.
if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .forEach((origin) => {
            if (!allowedOrigins.includes(origin)) {
                allowedOrigins.push(origin);
            }
        });
}

app.use(cors({
    origin: allowedOrigins,
}));


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leetcode", leetcodeRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/admin", adminRoutes);

// Homepage
app.get("/", (req, res) => {
    res.send("Campus Code api is running.");
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB, then start accepting traffic - avoids serving
// requests before the database connection is actually ready.
const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server Is Running on PORT ${PORT}`);
    });
    startAutoSyncSchedule();
};

startServer();