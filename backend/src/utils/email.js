import dotenv from "dotenv";
dotenv.config();

import { Resend } from "resend";

// Created on first use: `new Resend()` throws when RESEND_API_KEY is missing,
// which would otherwise crash the whole server at import time.
// Never log the key itself.
let resend = null;
function getClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendEmail({ to, subject, html }) {
  try {
    const data = await getClient().emails.send({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully:", data.id);
    return data;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw new Error("Email sending failed.");
  }
}
