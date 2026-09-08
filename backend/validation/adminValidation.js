const z = require("zod");

// Coerce because query params always arrive as strings.
const listStudentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    year: z.coerce.number().int().min(1).max(4).optional()
});

// Fields an admin is allowed to edit on a student's behalf.
// Email and SIC ID are deliberately excluded even here - both are
// used as lookup/identity keys elsewhere (login, public profile
// URLs), so changing them needs more care than a simple field edit
// and wasn't part of what was asked for.
const adminUpdateStudentSchema = z.object({
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
    listStudentsQuerySchema,
    adminUpdateStudentSchema
};
