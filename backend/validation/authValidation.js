const z = require("zod");

const sendOtpSchema = z.object({
    email: z
        .string()
        .email("Invalid email address.")
        .endsWith("@silicon.ac.in", "Use only your Silicon email.")
        .transform((email) => email.toLowerCase().trim())
});

const verifyOtpSchema = z.object({
    email: z
        .string()
        .email("Invalid email address.")
        .endsWith("@silicon.ac.in", "Use only your Silicon email.")
        .transform((email) => email.toLowerCase().trim()),

    otp: z
        .union([z.string(), z.number()])
        .transform((otp) => String(otp))
        .refine((otp) => /^\d{6}$/.test(otp), {
            message: "OTP must be exactly 6 digits."
        })
});

const completeProfileSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters long"),

    sicId: z
        .string()
        .trim()
        .min(1, "SIC ID is required"),

    year: z
        .number()
        .int("Year must be an integer")
        .min(1, "Year must be between 1 and 4")
        .max(4, "Year must be between 1 and 4"),

    whatsappNumber: z
        .string()
        .trim()
        .min(10, "Invalid WhatsApp number"),

    leetcodeUsername: z
        .string()
        .trim()
        .min(1, "LeetCode username is required")
});

const updateProfileSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters long")
        .optional(),

    year: z
        .number()
        .int("Year must be an integer")
        .min(1, "Year must be between 1 and 4")
        .max(4, "Year must be between 1 and 4")
        .optional(),

    whatsappNumber: z
        .string()
        .trim()
        .min(10, "Invalid WhatsApp number")
        .optional(),

    leetcodeUsername: z
        .string()
        .trim()
        .min(1, "LeetCode username is required")
        .optional()
});

module.exports = {
    sendOtpSchema,
    verifyOtpSchema,
    completeProfileSchema,
    updateProfileSchema
};