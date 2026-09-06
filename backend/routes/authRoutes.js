const express = require("express");
const router = express.Router();
const transporter = require("../config/email");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const authenticateToken = require("../middleware/authMiddleware");
const User = require("../models/User");
const OTP = require("../models/OTP");
const RefreshToken = require("../models/RefreshToken");
const LeetCodeStats = require("../models/LeetCodeStats");

const {
    sendOtpSchema,
    verifyOtpSchema,
    completeProfileSchema,
    updateProfileSchema
} = require("../validation/authValidation");

const asyncHandler = require("../middleware/asyncHandler");


const createRefreshToken = async (userId) => {

    const refreshToken = crypto.randomBytes(64).toString("hex");

    const tokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    await RefreshToken.create({
        userId,
        tokenHash,
        expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        )
    });

    return refreshToken;
};


const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many OTP requests. Please try again later."
    }
});


/*
    SEND OTP
*/

router.post(
    "/send-otp",
    otpLimiter,
    asyncHandler(async (req, res) => {

        const result = sendOtpSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: result.error.issues[0].message
            });
        }

        const email = result.data.email;


        // OTP limiter per email

        const existingOtp = await OTP.findOne({ email });

        if (existingOtp) {

            const elapsedTime =
                Date.now() - existingOtp.createdAt.getTime();

            if (elapsedTime < 60 * 1000) {

                const remainingSeconds = Math.ceil(
                    (60 * 1000 - elapsedTime) / 1000
                );

                return res.status(429).json({
                    message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`
                });
            }
        }


        // Generate OTP

        const otp = Math.floor(
            100000 + Math.random() * 900000
        );


        // Hash OTP before storing it

        const otpHash = await bcrypt.hash(
            otp.toString(),
            10
        );


        // Remove existing OTP

        await OTP.deleteMany({ email });


        // Store hashed OTP

        await OTP.create({
            email,
            otpHash,
            expiresAt: new Date(
                Date.now() + 5 * 60 * 1000
            )
        });


        const mailOptions = {

            from: `"Campus Code" <${process.env.EMAIL_USER}>`,

            to: email,

            subject: "Campus Code verification code",

            html: `
                <div style="
                    margin: 0;
                    padding: 40px 20px;
                    background-color: #0b1120;
                    font-family: Arial, Helvetica, sans-serif;
                ">

                    <div style="
                        max-width: 560px;
                        margin: auto;
                    ">

                        <div style="
                            text-align: center;
                            padding: 10px 0 28px;
                        ">

                            <div style="
                                font-size: 28px;
                                font-weight: 800;
                                letter-spacing: 1px;
                                color: #ffffff;
                            ">
                                CAMPUS CODE
                            </div>

                            <div style="
                                margin-top: 8px;
                                font-size: 13px;
                                color: #8fa3bf;
                                letter-spacing: 0.5px;
                            ">
                                Learn • Solve • Compete
                            </div>

                        </div>


                        <div style="
                            background-color: #ffffff;
                            border-radius: 16px;
                            padding: 42px 35px;
                            text-align: center;
                        ">

                            <div style="
                                font-size: 28px;
                                font-weight: 700;
                                color: #111827;
                                margin-bottom: 12px;
                            ">
                                Verify your email
                            </div>


                            <div style="
                                font-size: 15px;
                                line-height: 24px;
                                color: #64748b;
                                margin-bottom: 30px;
                            ">
                                Use the verification code below to
                                continue to Campus Code.
                            </div>


                            <div style="
                                display: inline-block;
                                background-color: #f1f5ff;
                                border: 1px solid #dbe5ff;
                                border-radius: 12px;
                                padding: 18px 30px;
                                margin-bottom: 20px;
                            ">

                                <div style="
                                    font-size: 34px;
                                    font-weight: 800;
                                    letter-spacing: 8px;
                                    color: #2563eb;
                                ">
                                    ${otp}
                                </div>

                            </div>


                            <div style="
                                font-size: 13px;
                                color: #64748b;
                                margin-bottom: 30px;
                            ">
                                This code expires in
                                <strong>5 minutes</strong>.
                            </div>


                            <div style="
                                height: 1px;
                                background-color: #e5e7eb;
                                margin: 0 0 25px;
                            "></div>


                            <div style="
                                font-size: 12px;
                                line-height: 20px;
                                color: #94a3b8;
                            ">
                                If you didn't request this verification
                                code, you can safely ignore this email.
                            </div>

                        </div>


                        <div style="
                            text-align: center;
                            padding: 25px 0 5px;
                            font-size: 12px;
                            color: #64748b;
                        ">
                            CAMPUS CODE • 2026
                        </div>

                    </div>

                </div>
            `
        };


        try {

            await transporter.sendMail(mailOptions);

            return res.json({
                message: "OTP sent successfully."
            });

        } catch (error) {

            console.error(
                "Error sending OTP email:",
                error
            );

            await OTP.deleteMany({ email });

            return res.status(500).json({
                message: "Failed to send OTP email."
            });
        }

    })
);


/*
    VERIFY OTP
*/

router.post(
    "/verify-otp",
    asyncHandler(async (req, res) => {

        const result = verifyOtpSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: result.error.issues[0].message
            });
        }

        const email = result.data.email;
        const enteredOtp = result.data.otp;


        if (!email || !enteredOtp) {
            return res.status(400).json({
                message: "Email and OTP are required."
            });
        }


        const storedOtp = await OTP.findOne({ email });


        if (!storedOtp) {
            return res.status(400).json({
                message:
                    "No OTP found. Please request a new OTP."
            });
        }


        // Check expiration

        if (
            Date.now() >
            storedOtp.expiresAt.getTime()
        ) {

            await OTP.deleteOne({
                _id: storedOtp._id
            });

            return res.status(400).json({
                message:
                    "OTP has expired. Please request a new OTP."
            });
        }


        // Maximum 5 attempts

        if (storedOtp.attempts >= 5) {

            await OTP.deleteOne({
                _id: storedOtp._id
            });

            return res.status(429).json({
                message:
                    "Too many incorrect attempts. Please request a new OTP."
            });
        }


        // Compare OTP with stored hash

        const isValid = await bcrypt.compare(
            enteredOtp,
            storedOtp.otpHash
        );


        if (!isValid) {

            storedOtp.attempts += 1;

            await storedOtp.save();

            return res.status(400).json({
                message: "Invalid OTP."
            });
        }


        // OTP successfully verified

        await OTP.deleteOne({
            _id: storedOtp._id
        });


        // Find existing user or create new one

        let user = await User.findOne({ email });


        if (!user) {

            user = await User.create({
                email
            });
        }


        // Generate access token

        const accessToken = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        );


        // Generate refresh token

        const refreshToken =
            await createRefreshToken(user._id);


        return res.json({

            message:
                "OTP verified successfully.",

            accessToken,

            refreshToken
        });

    })
);


/*
    COMPLETE / UPDATE PROFILE
*/

router.post(
    "/complete-profile",
    authenticateToken,
    asyncHandler(async (req, res) => {

        const result = completeProfileSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: result.error.issues[0].message
            });
        }

        const {
            name,
            sicId,
            year,
            whatsappNumber,
            leetcodeUsername
        } = result.data;

        const email = req.user.email;

        // Find the account created after OTP verification
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User account not found."
            });
        }

        // Profile has already been completed
        if (
            user.name ||
            user.sicId ||
            user.year ||
            user.whatsappNumber ||
            user.leetcodeUsername
        ) {
            return res.status(409).json({
                message: "Profile already exists."
            });
        }

        // Check duplicate SIC ID
        const existingSic = await User.findOne({
            sicId,
            _id: { $ne: user._id }
        });

        if (existingSic) {
            return res.status(409).json({
                message: "SIC ID is already registered."
            });
        }

        // Check duplicate LeetCode username
        const existingLeetcode = await User.findOne({
            leetcodeUsername,
            _id: { $ne: user._id }
        });

        if (existingLeetcode) {
            return res.status(409).json({
                message: "LeetCode username is already registered."
            });
        }

        // Complete the existing account
        user.name = name;
        user.sicId = sicId;
        user.year = year;
        user.whatsappNumber = whatsappNumber;
        user.leetcodeUsername = leetcodeUsername;

        await user.save();

        await LeetCodeStats.create({
            userId: user._id,
            leetcodeUsername: user.leetcodeUsername
        });

        return res.status(201).json({
            message: "Profile created successfully.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                sicId: user.sicId,
                year: user.year,
                leetcodeUsername: user.leetcodeUsername,
                profilePicture: user.profilePicture,
                role: user.role
            }
        });
    })
);

//Profile modificatons

router.patch(
    "/update-profile",
    authenticateToken,
    asyncHandler(async (req, res) => {

        const result = updateProfileSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: result.error.issues[0].message
            });
        }

        const {
            name,
            year,
            whatsappNumber,
            leetcodeUsername
        } = result.data;

        const user = await User.findOne({
            email: req.user.email
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // Check LeetCode username if it is being changed
        if (
            leetcodeUsername &&
            leetcodeUsername !== user.leetcodeUsername
        ) {
            const existingLeetcode =
                await User.findOne({
                    leetcodeUsername,
                    _id: { $ne: user._id }
                });

            if (existingLeetcode) {
                return res.status(409).json({
                    message:
                        "LeetCode username is already registered."
                });
            }

            user.leetcodeUsername = leetcodeUsername;

            // The cached stats belong to the OLD username.
            // Point LeetCodeStats at the new username and wipe
            // the cache so the next sync fetches fresh data
            // instead of showing stale numbers under a new name.
            await LeetCodeStats.findOneAndUpdate(
                { userId: user._id },
                {
                    leetcodeUsername,
                    totalSolved: 0,
                    easySolved: 0,
                    mediumSolved: 0,
                    hardSolved: 0,
                    leetcodePoints: 0,
                    contestRating: 0,
                    leetcodeRank: null,
                    lastUpdated: null
                },
                { upsert: true }
            );
        }

        if (name !== undefined) {
            user.name = name;
        }

        if (year !== undefined) {
            user.year = year;
        }

        if (whatsappNumber !== undefined) {
            user.whatsappNumber = whatsappNumber;
        }

        await user.save();

        return res.json({
            message: "Profile updated successfully.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                sicId: user.sicId,
                year: user.year,
                leetcodeUsername: user.leetcodeUsername,
                profilePicture: user.profilePicture,
                role: user.role
            }
        });
    })
);


/*
    REFRESH ACCESS TOKEN
*/

router.post(
    "/refresh",
    asyncHandler(async (req, res) => {

        const { refreshToken } = req.body;


        if (!refreshToken) {

            return res.status(401).json({
                message:
                    "Refresh token is required."
            });
        }


        const tokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");


        const storedToken =
            await RefreshToken.findOne({
                tokenHash
            });


        if (!storedToken) {

            return res.status(401).json({
                message:
                    "Invalid refresh token."
            });
        }


        if (
            storedToken.expiresAt <
            new Date()
        ) {

            await RefreshToken.deleteOne({
                _id: storedToken._id
            });

            return res.status(401).json({
                message:
                    "Refresh token has expired."
            });
        }


        const user =
            await User.findById(
                storedToken.userId
            );


        if (!user) {

            await RefreshToken.deleteOne({
                _id: storedToken._id
            });

            return res.status(401).json({
                message:
                    "User not found."
            });
        }


        const accessToken = jwt.sign(

            {
                userId: user._id,
                email: user.email
            },

            process.env.JWT_SECRET,

            {
                expiresIn: "15m"
            }

        );


        return res.json({
            accessToken
        });

    })
);


/*
    LOGOUT
*/

router.post(
    "/logout",
    asyncHandler(async (req, res) => {

        const { refreshToken } = req.body;


        if (!refreshToken) {

            return res.status(400).json({
                message:
                    "Refresh token is required."
            });
        }


        const tokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");


        await RefreshToken.deleteOne({
            tokenHash
        });


        return res.json({
            message:
                "Logged out successfully."
        });

    })
);

//My profile

router.get(
    "/me",
    authenticateToken,
    asyncHandler(async (req, res) => {

        // Find the logged-in user
        const user = await User.findById(
            req.user.userId
        ).select("-__v");

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // Find the user's LeetCode statistics
        const stats = await LeetCodeStats.findOne({
            userId: user._id
        }).select("-__v");

        return res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                sicId: user.sicId,
                year: user.year,
                whatsappNumber: user.whatsappNumber,
                leetcodeUsername: user.leetcodeUsername,
                profilePicture: user.profilePicture,
                role: user.role
            },

            leetcode: stats
                ? {
                    totalSolved: stats.totalSolved,
                    easySolved: stats.easySolved,
                    mediumSolved: stats.mediumSolved,
                    hardSolved: stats.hardSolved,
                    points: stats.leetcodePoints,
                    leetcodeRank: stats.leetcodeRank,
                    lastUpdated: stats.lastUpdated
                }
                : null
        });

    })
);


module.exports = router;