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

/**
 * Validate if email is real (not test/fake email)
 */
function isRealEmail(email) {
  if (!email || typeof email !== 'string') return false;

  // Common test/fake email patterns to exclude
  const fakePatterns = [
    /test@/i,
    /fake@/i,
    /example@/i,
    /demo@/i,
    /@test\./i,
    /@fake\./i,
    /@example\./i,
    /@demo\./i,
    /noreply@/i,
    /no-reply@/i,
    /donotreply@/i,
    /@localhost/i,
    /@127\.0\.0\.1/i,
    /test\d+@/i, // test123@example.com
    /user\d+@/i, // user123@test.com
  ];

  // Check if email matches any fake pattern
  for (const pattern of fakePatterns) {
    if (pattern.test(email)) {
      return false;
    }
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Check for common free email providers (these are real)
  const realEmailDomains = [
    '@gmail.com',
    '@yahoo.com',
    '@outlook.com',
    '@hotmail.com',
    '@live.com',
    '@icloud.com',
    '@protonmail.com',
    '@aol.com',
    '@mail.com',
    '@zoho.com',
  ];

  // If it's a known real email provider, accept it
  const lowerEmail = email.toLowerCase();
  for (const domain of realEmailDomains) {
    if (lowerEmail.endsWith(domain)) {
      return true;
    }
  }

  // For custom domains, accept if it's not in fake list
  return true;
}

/**
 * Send application status change notification email
 */
export async function sendStatusChangeEmail({ candidate, recruiter, job, oldStatus, newStatus, applicationId }) {
  try {
    // Validate candidate email is real
    if (!isRealEmail(candidate.email)) {
      console.log(`⚠️  Skipping email to ${candidate.email} (not a real email)`);
      return { success: false, message: "Not a real email address" };
    }

    const transporter = createTransporter();

    if (!transporter) {
      console.warn("⚠️  Email transporter not configured. Skipping email.");
      return { success: false, message: "Email not configured" };
    }

    // Status-specific content
    const statusConfig = {
      'viewed': {
        emoji: '👀',
        title: 'Your application has been viewed',
        message: 'Good news! The recruiter has reviewed your application.',
        color: '#3b82f6',
      },
      'moving-forward': {
        emoji: '🚀',
        title: 'Your application is moving forward!',
        message: 'Exciting news! The recruiter wants to move forward with your application.',
        color: '#8b5cf6',
      },
      'accepted': {
        emoji: '🎉',
        title: 'Congratulations! Application Accepted',
        message: 'Fantastic news! Your application has been accepted!',
        color: '#10b981',
      },
      'rejected': {
        emoji: '📋',
        title: 'Application Status Update',
        message: 'Thank you for your interest. After careful review, we\'ve decided to move forward with other candidates.',
        color: '#ef4444',
      },
    };

    const config = statusConfig[newStatus] || statusConfig['viewed'];

    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@rizehire.com",
      to: candidate.email,
      subject: `${config.emoji} ${config.title} - ${job.title}`,
      html: `
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
              background: ${config.color};
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
            .status-box {
              background: white;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
              border-left: 4px solid ${config.color};
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .cta-button {
              display: inline-block;
              background: ${config.color};
              color: white;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 6px;
              font-weight: bold;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 36px;">${config.emoji}</h1>
            <h2 style="margin: 10px 0 0 0;">${config.title}</h2>
          </div>

          <div class="content">
            <p>Hi ${candidate.name},</p>

            <div class="status-box">
              <h3 style="margin-top: 0; color: ${config.color};">${job.title}</h3>
              <p style="margin: 0;">${config.message}</p>
            </div>

            ${newStatus === 'moving-forward' || newStatus === 'accepted' ? `
              <p><strong>The recruiter ${recruiter.name} may contact you soon with next steps.</strong></p>
              <p>You can also send them a message directly through RizeHire:</p>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/messages?application=${applicationId}" class="cta-button">
                  Send Message
                </a>
              </div>
            ` : ''}

            ${newStatus === 'viewed' ? `
              <p>Keep an eye on your email and RizeHire dashboard for updates!</p>
            ` : ''}

            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications" style="color: ${config.color};">
                View Your Applications →
              </a>
            </p>
          </div>

          <div class="footer">
            <p>This is an automated notification from RizeHire</p>
            <p>© ${new Date().getFullYear()} RizeHire. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `${config.title}\n\nHi ${candidate.name},\n\n${config.message}\n\nJob: ${job.title}\nRecruiter: ${recruiter.name}\n\nVisit ${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications to view your application.\n\n---\nRizeHire Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Status change email sent to ${candidate.email}:`, info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending status change email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send new message notification email
 */
export async function sendMessageNotificationEmail(receiver, sender, job, messageText, applicationId) {
  try {
    // Validate receiver email is real
    if (!isRealEmail(receiver.email)) {
      console.log(`⚠️  Skipping email to ${receiver.email} (not a real email)`);
      return { success: false, message: "Not a real email address" };
    }

    const transporter = createTransporter();

    if (!transporter) {
      console.warn("⚠️  Email transporter not configured. Skipping email.");
      return { success: false, message: "Email not configured" };
    }

    // Truncate message preview to 150 characters
    const messagePreview = messageText.length > 150
      ? messageText.substring(0, 150) + '...'
      : messageText;

    const mailOptions = {
      from: process.env.SMTP_FROM || "noreply@rizehire.com",
      to: receiver.email,
      subject: `💬 New message from ${sender.name} about ${job.title}`,
      html: `
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
            .message-box {
              background: white;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
              border-left: 4px solid #667eea;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .sender-name {
              color: #667eea;
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 10px;
            }
            .job-title {
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 15px;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 6px;
              font-weight: bold;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">💬 New Message</h1>
            <p style="margin: 10px 0 0 0;">RizeHire</p>
          </div>

          <div class="content">
            <p>Hi ${receiver.name},</p>

            <p>You have a new message from <strong>${sender.name}</strong> regarding the <strong>${job.title}</strong> position.</p>

            <div class="message-box">
              <div class="sender-name">${sender.name}</div>
              <div class="job-title">Re: ${job.title}</div>
              <p style="margin: 0; white-space: pre-wrap;">${messagePreview}</p>
            </div>

            <p>Click below to view the full message and reply:</p>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/messages?application=${applicationId}" class="cta-button">
                View Message
              </a>
            </div>

            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              💡 Tip: Responding quickly increases your chances of success!
            </p>
          </div>

          <div class="footer">
            <p>This is an automated notification from RizeHire</p>
            <p>© ${new Date().getFullYear()} RizeHire. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${receiver.name},\n\nYou have a new message from ${sender.name} regarding the ${job.title} position.\n\nMessage:\n${messagePreview}\n\nVisit ${process.env.FRONTEND_URL || 'http://localhost:3000'}/messages?application=${applicationId} to view and reply.\n\n---\nRizeHire Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Message notification sent to ${receiver.email}:`, info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending message notification:", error);
    return { success: false, error: error.message };
  }
}
