const nodemailer = require("nodemailer");

// Using explicit SMTP settings (port 587 + STARTTLS) instead of
// nodemailer's `service: "gmail"` shortcut (which defaults to port 465).
// Several cloud hosts (Render included) block or restrict outbound
// port 465, and forcing IPv4 avoids a separate class of ETIMEDOUT
// caused by unreliable outbound IPv6 routing to Gmail's servers.
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS upgrades the connection after connecting
    requireTLS: true,
    family: 4, // force IPv4
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

module.exports = transporter;
