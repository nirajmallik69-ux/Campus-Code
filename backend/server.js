require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const leetcodeRoutes = require("./routes/leetcodeRoutes");
const errorHandler = require("./middleware/errorHandler");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(helmet());

const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5173",
    "https://campus-code.netlify.app/",
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

// Connect to MongoDB
connectDB();

// Error handling middleware
app.use(errorHandler);

// Port
app.listen(PORT, () => {
    console.log(`Server Is Running on PORT ${PORT}`);
});
