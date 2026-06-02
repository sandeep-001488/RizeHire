import dotenv from "dotenv";
dotenv.config();

import { Resend } from "resend";

console.log("RESEND_API_KEY at email.js load:", process.env.RESEND_API_KEY);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  try {
    const data = await resend.emails.send({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully:", data.id);
    return data;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Email sending failed.");
  }
}
