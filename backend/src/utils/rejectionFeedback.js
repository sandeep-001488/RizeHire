import { generateContent } from "../config/gemini.js";

/**
 * Generate detailed rejection feedback using AI
 * @param {Object} job - Job details
 * @param {Object} candidateProfile - Candidate's parsed resume
 * @param {Object} screeningResult - Screening results with reasons
 * @param {Number} matchScore - Match score (0-100)
 * @returns {Object} Detailed feedback with suggestions
 */
export async function generateRejectionFeedback({
  job,
  candidateProfile,
  screeningResult,
  matchScore,
}) {
  try {
    // Extract relevant data
    const jobSkills = job.skills || [];
    const candidateSkills = candidateProfile.skills || [];
    const candidateExperience = candidateProfile.yearsOfExperience || candidateProfile.total_experience_years || 0;
    const requiredExperience = job.hardConstraints?.minYears || job.ideal_experience || 0;

    // Calculate skill gaps
    const missingSkills = jobSkills.filter(
      (skill) => !candidateSkills.some((cs) => cs.toLowerCase().includes(skill.toLowerCase()))
    );
    const matchingSkills = jobSkills.filter(
      (skill) => candidateSkills.some((cs) => cs.toLowerCase().includes(skill.toLowerCase()))
    );

    // Basic feedback structure
    const feedback = {
      matchScore,
      primaryReasons: screeningResult.reasons || [],
      detailedAnalysis: {},
      improvementSuggestions: [],
      encouragement: "",
    };

    // If hard constraints failed, provide clear explanations
    if (screeningResult.hardFail) {
      feedback.detailedAnalysis = {
        hardConstraintsFailed: true,
        reasons: screeningResult.reasons,
      };

      // Generate improvement suggestions based on hard failures
      if (screeningResult.reasons.some((r) => r.includes("experience"))) {
        feedback.improvementSuggestions.push(
          `Gain more professional experience. This role requires ${requiredExperience}+ years, and you currently have ${candidateExperience} years.`
        );
        feedback.improvementSuggestions.push(
          "Consider taking on freelance projects or contributing to open-source to build your experience."
        );
      }

      feedback.encouragement = `While you didn't meet the hard requirements for this role, don't be discouraged! Use this as motivation to build the necessary skills and experience. You're on the right track!`;

      return feedback;
    }

    // For soft rejections, use AI to generate detailed feedback
    const prompt = `
You are a professional career counselor providing constructive feedback to a job applicant who was not selected.

Job Details:
- Title: ${job.title}
- Required Skills: ${jobSkills.join(", ")}
- Experience Level: ${job.experienceLevel || "not specified"}
- Ideal Experience: ${requiredExperience} years

Candidate Profile:
- Skills: ${candidateSkills.join(", ")}
- Experience: ${candidateExperience} years
- Matching Skills: ${matchingSkills.join(", ") || "None"}
- Missing Skills: ${missingSkills.join(", ") || "None"}
- Match Score: ${matchScore}/100

Generate a JSON response with:
1. "skillGapAnalysis": Brief analysis of which skills are missing and why they matter
2. "experienceGap": Analysis of experience level mismatch (if any)
3. "topSuggestions": Array of 3-5 specific, actionable suggestions to improve candidacy
4. "encouragement": A brief, genuine, encouraging message (2-3 sentences)

Return ONLY valid JSON in this exact format:
{
  "skillGapAnalysis": "string",
  "experienceGap": "string",
  "topSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "encouragement": "string"
}
`;

    const aiResponse = await generateContent(prompt);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const aiAnalysis = JSON.parse(jsonMatch[0]);

      feedback.detailedAnalysis = {
        skillGapAnalysis: aiAnalysis.skillGapAnalysis,
        experienceGap: aiAnalysis.experienceGap,
        matchingSkills: matchingSkills.length > 0 ? matchingSkills : null,
        missingSkills: missingSkills.length > 0 ? missingSkills : null,
      };

      feedback.improvementSuggestions = aiAnalysis.topSuggestions;
      feedback.encouragement = aiAnalysis.encouragement;
    } else {
      // Enhanced fallback if AI fails - provides detailed analysis
      console.log("⚠️  Using enhanced fallback (AI not available)");

      const matchPercentage = jobSkills.length > 0
        ? Math.round((matchingSkills.length / jobSkills.length) * 100)
        : 0;

      // Skill Gap Analysis
      let skillGapAnalysis = "";
      if (matchingSkills.length === 0) {
        skillGapAnalysis = `Your profile doesn't show any of the required skills for this ${job.title} position. This role requires expertise in ${jobSkills.slice(0, 3).join(", ")}${jobSkills.length > 3 ? ` and ${jobSkills.length - 3} other key skills` : ""}.`;
      } else if (matchPercentage < 30) {
        skillGapAnalysis = `You matched ${matchingSkills.length} out of ${jobSkills.length} required skills (${matchPercentage}%). While you have some relevant skills, there are significant gaps in the core competencies needed for this role.`;
      } else if (matchPercentage < 60) {
        skillGapAnalysis = `You have ${matchingSkills.length} out of ${jobSkills.length} required skills (${matchPercentage}%). You're on the right track, but developing the missing skills would significantly strengthen your candidacy.`;
      } else {
        skillGapAnalysis = `You matched ${matchingSkills.length} out of ${jobSkills.length} required skills (${matchPercentage}%). You have most of the required skills - other candidates had slightly more experience or a better overall fit.`;
      }

      // Experience Gap Analysis
      const experienceDiff = requiredExperience - candidateExperience;
      let experienceGap = "";
      if (experienceDiff > 2) {
        experienceGap = `This role requires ${requiredExperience}+ years of experience, while you currently have ${candidateExperience} year${candidateExperience !== 1 ? 's' : ''}. Consider gaining more hands-on experience through projects, internships, or freelance work.`;
      } else if (experienceDiff > 0) {
        experienceGap = `The role prefers ${requiredExperience}+ years of experience (you have ${candidateExperience} year${candidateExperience !== 1 ? 's' : ''}). You're close! Build a strong portfolio to compensate for the experience gap.`;
      } else {
        experienceGap = `Your experience level (${candidateExperience} years) meets the requirements. The decision was based more on skill alignment and other factors.`;
      }

      feedback.detailedAnalysis = {
        skillGapAnalysis,
        experienceGap,
        matchingSkills: matchingSkills.length > 0 ? matchingSkills : null,
        missingSkills: missingSkills.length > 0 ? missingSkills : null,
      };

      // Generate specific improvement suggestions
      const suggestions = [];

      if (missingSkills.length > 0) {
        const topMissing = missingSkills.slice(0, 3);
        suggestions.push(`Focus on learning ${topMissing.length === 1 ? topMissing[0] : topMissing.slice(0, -1).join(", ") + " and " + topMissing[topMissing.length - 1]} - these are critical for this role.`);
        suggestions.push(`Take online courses on platforms like Udemy, Coursera, or freeCodeCamp to build these skills systematically.`);
      }

      if (matchScore < 50) {
        suggestions.push(`Build 2-3 hands-on projects showcasing ${missingSkills.slice(0, 2).join(" and ")} to demonstrate practical experience.`);
      } else {
        suggestions.push(`Strengthen your portfolio by combining your existing skills with the missing ones in real projects.`);
      }

      if (experienceDiff > 1) {
        suggestions.push(`Gain practical experience through freelance work, open-source contributions, or internships.`);
      } else if (matchScore >= 50) {
        suggestions.push(`You're close! Network with professionals in this field and consider asking for referrals.`);
      }

      suggestions.push(`Tailor your resume to highlight skills most relevant to each position you apply for.`);

      feedback.improvementSuggestions = suggestions.slice(0, 5);

      // Personalized encouragement
      if (matchScore === 0) {
        feedback.encouragement = "Starting a new career path takes courage! Focus on building foundational skills. Remember, every expert was once a beginner. You've got this!";
      } else if (matchScore < 30) {
        feedback.encouragement = "You're taking important first steps! Each application is a learning opportunity. Keep building your skills consistently, and you'll see progress!";
      } else if (matchScore < 60) {
        feedback.encouragement = "You're making solid progress! You already have relevant skills - just need to fill some gaps. Stay consistent with learning, and the right opportunity will come!";
      } else {
        feedback.encouragement = "You're so close! You have most of what's needed. A few more projects or a bit more experience, and you'll be landing these roles. Keep pushing forward!";
      }
    }

    return feedback;
  } catch (error) {
    console.error("Error generating rejection feedback:", error);

    // Return basic fallback feedback
    return {
      matchScore: matchScore || 0,
      primaryReasons: screeningResult.reasons || ["Your profile didn't match the job requirements closely enough."],
      detailedAnalysis: {
        message: "While we couldn't provide detailed analysis at this time, we encourage you to review the job requirements and enhance your skills accordingly.",
      },
      improvementSuggestions: [
        "Review the job requirements carefully",
        "Enhance your skills in the areas mentioned in the job description",
        "Build projects to showcase your abilities",
      ],
      encouragement: "Don't give up! Every application is a step forward in your career journey.",
    };
  }
}

/**
 * Generate a brief rejection summary for immediate feedback
 * @param {Object} screeningResult - Screening results
 * @param {Number} matchScore - Match score
 * @returns {String} Brief rejection message
 */
export function generateQuickRejectionMessage(screeningResult, matchScore) {
  if (screeningResult.hardFail) {
    return screeningResult.reasons.join(". ") + ". Please review the job requirements carefully.";
  }

  if (matchScore < 30) {
    return "Your profile doesn't closely match the job requirements. Consider building skills in the required areas.";
  } else if (matchScore < 50) {
    return "Your profile partially matches the requirements, but we're looking for candidates with a closer skill match.";
  } else if (matchScore < 70) {
    return "You have many relevant skills, but other candidates matched the requirements more closely.";
  } else {
    return "You're a strong candidate, but other applicants had a slightly better match for this specific role.";
  }
}
