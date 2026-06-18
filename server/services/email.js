// server/services/email.js
// Sends trip ticket confirmation emails via Gmail + Nodemailer.
//
// Setup required in server/.env:
//   GMAIL_USER=your-account@gmail.com
//   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   (16-char App Password, NOT your normal password)
//
// To generate a Gmail App Password:
//   1. Enable 2-Step Verification on the Google account
//   2. Go to https://myaccount.google.com/apppasswords
//   3. Create a password for "Mail" — paste the 16 characters into .env (spaces optional)

const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn(
      "⚠️  GMAIL_USER / GMAIL_APP_PASSWORD not set in .env — trip emails will be skipped."
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * buildTripEmailHtml — formats a trip ticket as an HTML email body.
 */
function buildTripEmailHtml(ticket, statusLabel) {
  const assignments = (ticket.assignments || [])
    .map(
      (a, i) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;">${escapeHtml(a.plateNumber || a.vehicleId)}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;">${escapeHtml(a.vehicleModel || "")}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;">${escapeHtml(a.driverName || "Unassigned")}</td>
      </tr>`
    )
    .join("");

  const passengers = (ticket.passengers || [])
    .map((p, i) => `<li>${escapeHtml(p.name)}${p.designation ? ` — ${escapeHtml(p.designation)}` : ""}</li>`)
    .join("");

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
    <div style="background:#7B1C1C;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h2 style="color:#fff;margin:0;font-size:18px;">BukSU Motorpool — Trip Ticket</h2>
      <p style="color:#E8C255;margin:4px 0 0;font-size:13px;">Status: ${escapeHtml(statusLabel)}</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:20px 24px;border-radius:0 0 8px 8px;">
      <table style="width:100%;font-size:14px;margin-bottom:16px;">
        <tr><td style="padding:4px 0;color:#6b7280;width:160px;">Requestor</td><td>${escapeHtml(ticket.requestorName)} (${escapeHtml(ticket.requestorDept)})</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Destination</td><td>${escapeHtml(ticket.destination)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Purpose</td><td>${escapeHtml(ticket.purpose)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Date of Travel</td><td>${escapeHtml(ticket.dateTravel)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Departure</td><td>${escapeHtml(ticket.timeDepart || "—")}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Expected Return</td><td>${escapeHtml(ticket.timeReturn || "—")}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Number of Passengers</td><td>${ticket.passengers?.length || 0}</td></tr>
      </table>

      ${passengers ? `
      <p style="font-weight:bold;font-size:13px;margin:0 0 4px;">Passengers</p>
      <ul style="font-size:13px;margin:0 0 16px;padding-left:18px;">${passengers}</ul>
      ` : ""}

      <p style="font-weight:bold;font-size:13px;margin:0 0 8px;">Vehicle(s) & Driver(s) Assigned</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left;">#</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left;">Plate No.</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left;">Vehicle</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left;">Driver</th>
          </tr>
        </thead>
        <tbody>${assignments || `<tr><td colspan="4" style="padding:10px;text-align:center;color:#9ca3af;">Not yet assigned</td></tr>`}</tbody>
      </table>

      ${ticket.remarks ? `<p style="font-size:13px;margin-top:16px;"><strong>Remarks:</strong> ${escapeHtml(ticket.remarks)}</p>` : ""}

      <p style="font-size:11px;color:#9ca3af;margin-top:24px;">
        This is an automated notification from the BukSU PPMU Motorpool System. Please do not reply directly to this email.
      </p>
    </div>
  </div>`;
}

/**
 * sendTripEmail — sends to requestor and/or assigned drivers.
 * @param {object} ticket - the trip ticket data (with assignments[], passengers[])
 * @param {string} statusLabel - human label e.g. "Pending Approval", "Approved & Dispatched", "Completed"
 * @param {string[]} recipients - list of email addresses
 */
async function sendTripEmail(ticket, statusLabel, recipients = []) {
  const validRecipients = recipients.filter(Boolean);
  if (validRecipients.length === 0) return { sent: false, reason: "No recipients" };

  const t = getTransporter();
  if (!t) return { sent: false, reason: "Email not configured" };

  try {
    await t.sendMail({
      from: `"BukSU Motorpool" <${process.env.GMAIL_USER}>`,
      to: validRecipients.join(","),
      subject: `Trip Ticket ${statusLabel} — ${ticket.destination} (${ticket.dateTravel})`,
      html: buildTripEmailHtml(ticket, statusLabel),
    });
    return { sent: true };
  } catch (err) {
    console.error("Email send failed:", err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendTripEmail };
