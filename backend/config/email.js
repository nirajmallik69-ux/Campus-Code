const axios = require("axios");

// Switched to Brevo's HTTPS transactional email API - same reasoning
// as before: this is a plain HTTPS call over port 443, which no
// hosting platform blocks, unlike raw SMTP (which failed here with
// ETIMEDOUT/ENETUNREACH on Render regardless of port or credentials).
//
// Setup (free, no credit card, no domain required):
//   1. Sign up at https://www.brevo.com
//   2. Settings > Senders, Domains & Dedicated IPs > Senders >
//      Add a Sender - verify EMAIL_USER as a single sender (Brevo
//      emails a confirmation link to that address).
//   3. Settings > SMTP & API > API Keys > generate a key, put it in
//      BREVO_API_KEY.

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Parses `"Campus Code" <user@example.com>` into { name, email },
// the shape Brevo's API expects for the sender field.
function parseFrom(from) {
    const match = /^"?([^"<]*)"?\s*<(.+)>$/.exec(from || "");
    if (match) {
        return { name: match[1].trim() || undefined, email: match[2].trim() };
    }
    return { email: (from || "").trim() };
}

const transporter = {
    sendMail: async ({ from, to, subject, html }) => {
        const response = await axios.post(
            BREVO_API_URL,
            {
                sender: parseFrom(from),
                to: [{ email: to }],
                subject,
                htmlContent: html
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "api-key": process.env.BREVO_API_KEY
                }
            }
        );

        return response.data;
    }
};

module.exports = transporter;
