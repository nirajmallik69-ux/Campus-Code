const z = require("zod");

// Coerce because query params always arrive as strings.
const listStudentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    year: z.coerce.number().int().min(1).max(4).optional()
});

module.exports = {
    listStudentsQuerySchema
};
