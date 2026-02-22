import nodemailer from "nodemailer";

// Create transporter with SMTP configuration
const createTransporter = () => {
  // Check if using Mailtrap (for testing) or Resend (for production)
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    // Mailtrap or custom SMTP
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else if (process.env.RESEND_API_KEY) {
    // Resend API
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY,
      },
    });
  } else {
    console.warn("⚠️  No email configuration found. Emails will not be sent.");
    return null;
  }
};

/**
 * Send application rejection email with detailed feedback
 * @param {Object} params - Email parameters
 */
export async function sendRejectionEmail({
  candidateEmail,
  candidateName,
  jobTitle,
  companyName,
  rejectionFeedback,
}) {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.warn("⚠️  Email transporter not configured. Skipping email.");
      return { success: false, message: "Email not configured" };
    }

    const emailHtml = generateRejectionEmailHTML({
      candidateName,
      jobTitle,
      companyName,
      rejectionFeedback,
    });

    const emailText = generateRejectionEmailText({
      candidateName,
      jobTitle,
      companyName,
      rejectionFeedback,
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@rizehire.com",
      to: candidateEmail,
      subject: `Update on your application for ${jobTitle}`,
      text: emailText,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Rejection email sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ Error sending rejection email:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate HTML email template for rejection
 */
function generateRejectionEmailHTML({
  candidateName,
  jobTitle,
  companyName,
  rejectionFeedback,
}) {
  const { matchScore, detailedAnalysis, improvementSuggestions, encouragement } = rejectionFeedback;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px 20px;
      border: 1px solid #e5e7eb;
    }
    .score-badge {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 18px;
      margin: 10px 0;
    }
    .section {
      background: white;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .section-title {
      color: #667eea;
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 10px;
    }
    .suggestion-list {
      list-style: none;
      padding: 0;
    }
    .suggestion-list li {
      padding: 10px;
      margin: 8px 0;
      background: #f0f9ff;
      border-left: 3px solid #3b82f6;
      border-radius: 4px;
    }
    .encouragement {
      background: #fef3c7;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
      margin-top: 20px;
      font-style: italic;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .skills-list {
      display: inline-block;
      padding: 4px 10px;
      background: #e0e7ff;
      color: #4f46e5;
      border-radius: 12px;
      margin: 4px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">RizeHire</h1>
    <p style="margin: 10px 0 0 0;">Application Update</p>
  </div>

  <div class="content">
    <p>Dear ${candidateName},</p>

    <p>Thank you for your interest in the <strong>${jobTitle}</strong> position${companyName ? ` at ${companyName}` : ""}. After careful review, we've decided to move forward with other candidates whose profiles more closely match our current needs.</p>

    <p>We want to help you improve for future opportunities. Here's detailed feedback on your application:</p>

    <div style="text-align: center;">
      <span class="score-badge">Match Score: ${matchScore}%</span>
    </div>

    ${detailedAnalysis.skillGapAnalysis ? `
    <div class="section">
      <div class="section-title">📊 Skills Analysis</div>
      <p>${detailedAnalysis.skillGapAnalysis}</p>
      ${detailedAnalysis.matchingSkills && detailedAnalysis.matchingSkills.length > 0 ? `
        <p><strong>✅ Skills you matched:</strong><br/>
        ${detailedAnalysis.matchingSkills.map(skill => `<span class="skills-list">${skill}</span>`).join('')}
        </p>
      ` : ''}
      ${detailedAnalysis.missingSkills && detailedAnalysis.missingSkills.length > 0 ? `
        <p><strong>📚 Skills to develop:</strong><br/>
        ${detailedAnalysis.missingSkills.map(skill => `<span class="skills-list">${skill}</span>`).join('')}
        </p>
      ` : ''}
    </div>
    ` : ''}

    ${detailedAnalysis.experienceGap ? `
    <div class="section">
      <div class="section-title">💼 Experience Level</div>
      <p>${detailedAnalysis.experienceGap}</p>
    </div>
    ` : ''}

    ${improvementSuggestions && improvementSuggestions.length > 0 ? `
    <div class="section">
      <div class="section-title">🚀 Improvement Suggestions</div>
      <ul class="suggestion-list">
        ${improvementSuggestions.map(suggestion => `<li>💡 ${suggestion}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${encouragement ? `
    <div class="encouragement">
      <strong>✨ Keep Going!</strong><br/>
      ${encouragement}
    </div>
    ` : ''}

    <p style="margin-top: 30px;">We encourage you to keep applying and building your skills. Thank you for considering us, and we wish you the best in your job search!</p>

    <p>Best regards,<br/>
    <strong>The RizeHire Team</strong></p>
  </div>

  <div class="footer">
    <p>This is an automated message from RizeHire</p>
    <p>© ${new Date().getFullYear()} RizeHire. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email for rejection
 */
function generateRejectionEmailText({
  candidateName,
  jobTitle,
  companyName,
  rejectionFeedback,
}) {
  const { matchScore, detailedAnalysis, improvementSuggestions, encouragement } = rejectionFeedback;

  let text = `Dear ${candidateName},\n\n`;
  text += `Thank you for your interest in the ${jobTitle} position${companyName ? ` at ${companyName}` : ""}. After careful review, we've decided to move forward with other candidates whose profiles more closely match our current needs.\n\n`;
  text += `We want to help you improve for future opportunities. Here's detailed feedback on your application:\n\n`;
  text += `MATCH SCORE: ${matchScore}%\n\n`;

  if (detailedAnalysis.skillGapAnalysis) {
    text += `SKILLS ANALYSIS:\n${detailedAnalysis.skillGapAnalysis}\n\n`;
    if (detailedAnalysis.matchingSkills && detailedAnalysis.matchingSkills.length > 0) {
      text += `Skills you matched: ${detailedAnalysis.matchingSkills.join(", ")}\n\n`;
    }
    if (detailedAnalysis.missingSkills && detailedAnalysis.missingSkills.length > 0) {
      text += `Skills to develop: ${detailedAnalysis.missingSkills.join(", ")}\n\n`;
    }
  }

  if (detailedAnalysis.experienceGap) {
    text += `EXPERIENCE LEVEL:\n${detailedAnalysis.experienceGap}\n\n`;
  }

  if (improvementSuggestions && improvementSuggestions.length > 0) {
    text += `IMPROVEMENT SUGGESTIONS:\n`;
    improvementSuggestions.forEach((suggestion, index) => {
      text += `${index + 1}. ${suggestion}\n`;
    });
    text += `\n`;
  }

  if (encouragement) {
    text += `KEEP GOING!\n${encouragement}\n\n`;
  }

  text += `We encourage you to keep applying and building your skills. Thank you for considering us, and we wish you the best in your job search!\n\n`;
  text += `Best regards,\nThe RizeHire Team\n\n`;
  text += `---\nThis is an automated message from RizeHire\n`;
  text += `© ${new Date().getFullYear()} RizeHire. All rights reserved.`;

  return text;
}

/**
 * Send application accepted email
 */
export async function sendAcceptanceEmail({
  candidateEmail,
  candidateName,
  jobTitle,
  companyName,
  nextSteps,
}) {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.warn("⚠️  Email transporter not configured. Skipping email.");
      return { success: false, message: "Email not configured" };
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@rizehire.com",
      to: candidateEmail,
      subject: `🎉 Congratulations! Your application for ${jobTitle} has been accepted`,
      html: `
        <h2>Congratulations, ${candidateName}!</h2>
        <p>We're pleased to inform you that your application for <strong>${jobTitle}</strong>${companyName ? ` at ${companyName}` : ""} has been accepted!</p>
        ${nextSteps ? `<p><strong>Next Steps:</strong> ${nextSteps}</p>` : ''}
        <p>We'll be in touch soon with more details.</p>
        <p>Best regards,<br/>The RizeHire Team</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Acceptance email sent:", info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending acceptance email:", error);
    return { success: false, error: error.message };
  }
}
