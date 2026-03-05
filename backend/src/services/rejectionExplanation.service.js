/**
 * Service to generate rejection explanations with SHAP/LIME analysis
 */

import axios from "axios";

const SHAP_LIME_API = process.env.SHAP_LIME_API || "http://localhost:5001";

/**
 * Get SHAP explanation from Python service
 */
export async function getSHAPExplanation(matchBreakdown) {
  try {
    const response = await axios.post(`${SHAP_LIME_API}/explain/shap`, {
      skills: matchBreakdown?.skills?.score || 0,
      experience: matchBreakdown?.experience?.score || 0,
      location: matchBreakdown?.location?.score || 0,
      salary: matchBreakdown?.salary?.score || 0,
    });

    return response.data;
  } catch (error) {
    console.error("SHAP explanation failed:", error.message);
    return null;
  }
}

/**
 * Get LIME explanation from Python service
 */
export async function getLIMEExplanation(matchBreakdown) {
  try {
    const response = await axios.post(`${SHAP_LIME_API}/explain/lime`, {
      skills: matchBreakdown?.skills?.score || 0,
      experience: matchBreakdown?.experience?.score || 0,
      location: matchBreakdown?.location?.score || 0,
      salary: matchBreakdown?.salary?.score || 0,
    });

    return response.data;
  } catch (error) {
    console.error("LIME explanation failed:", error.message);
    return null;
  }
}

/**
 * Generate rejection explanation with recommendations
 */
export async function generateRejectionExplanation({
  hardRuleFailed,
  matchBreakdown,
  job,
  candidate,
}) {
  try {
    // Get SHAP explanation (global feature importance)
    const shapExplanation = await getSHAPExplanation(matchBreakdown);

    // Get LIME explanation (local feature importance)
    const limeExplanation = await getLIMEExplanation(matchBreakdown);

    // Generate recommendations based on weak areas
    const recommendations = generateRecommendations(matchBreakdown, hardRuleFailed);

    // Determine primary reason
    let reason = "";
    if (hardRuleFailed && hardRuleFailed.length > 0) {
      reason = `Failed hard requirement: ${hardRuleFailed.join(", ")}`;
    } else {
      reason = `Low match score. Primary weak area: ${getWeakestArea(matchBreakdown)}`;
    }

    return {
      reason,
      hardRuleFailed: hardRuleFailed || [],
      matchBreakdown,
      shapExplanation: shapExplanation || null,
      limeExplanation: limeExplanation || null,
      recommendations,
    };
  } catch (error) {
    console.error("Error generating rejection explanation:", error);
    return {
      reason: "Application did not meet requirements",
      hardRuleFailed: hardRuleFailed || [],
      matchBreakdown,
      recommendations: ["Review job requirements", "Improve your profile"],
      shapExplanation: null,
      limeExplanation: null,
    };
  }
}

/**
 * Get weakest matching area
 */
function getWeakestArea(matchBreakdown) {
  const areas = [
    { name: "Skills", score: matchBreakdown?.skills?.score || 0 },
    { name: "Experience", score: matchBreakdown?.experience?.score || 0 },
    { name: "Location", score: matchBreakdown?.location?.score || 0 },
    { name: "Salary", score: matchBreakdown?.salary?.score || 0 },
  ];

  const weakest = areas.reduce((prev, curr) =>
    prev.score < curr.score ? prev : curr
  );

  return weakest.name;
}

/**
 * Generate improvement recommendations
 */
function generateRecommendations(matchBreakdown, hardRuleFailed) {
  const recommendations = [];

  if (hardRuleFailed && hardRuleFailed.length > 0) {
    hardRuleFailed.forEach((rule) => {
      if (rule.includes("experience")) {
        recommendations.push("Gain more relevant work experience");
      } else if (rule.includes("gender")) {
        recommendations.push("Note: Job has specific gender requirements");
      }
    });
  }

  // Check match scores and recommend improvements
  if ((matchBreakdown?.skills?.score || 0) < 50) {
    recommendations.push("Learn the required technical skills for this role");
  }

  if ((matchBreakdown?.experience?.score || 0) < 50) {
    recommendations.push("Build more experience in this domain");
  }

  if ((matchBreakdown?.location?.score || 0) < 50) {
    recommendations.push("Consider roles in your current location or open to relocation");
  }

  if ((matchBreakdown?.salary?.score || 0) < 50) {
    recommendations.push("Review your salary expectations for this role");
  }

  // Ensure we have recommendations
  if (recommendations.length === 0) {
    recommendations.push("Review your profile and improve weak areas");
    recommendations.push("Apply to more similar positions for better matches");
  }

  return recommendations;
}

/**
 * Format rejection explanation for email
 */
export function formatRejectionForEmail(explanation) {
  const { reason, hardRuleFailed, matchBreakdown, recommendations } = explanation;

  let emailContent = `<div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Application Review</h2>

    <p><strong>Reason:</strong> ${reason}</p>

    <h3>Match Analysis</h3>
    <ul>
      <li><strong>Skills Match:</strong> ${matchBreakdown?.skills?.score || 0}%</li>
      <li><strong>Experience Match:</strong> ${matchBreakdown?.experience?.score || 0}%</li>
      <li><strong>Location Match:</strong> ${matchBreakdown?.location?.score || 0}%</li>
      <li><strong>Salary Match:</strong> ${matchBreakdown?.salary?.score || 0}%</li>
    </ul>
  `;

  if (recommendations && recommendations.length > 0) {
    emailContent += `<h3>How to Improve</h3>
      <ul>
        ${recommendations.map((rec) => `<li>${rec}</li>`).join("")}
      </ul>
    `;
  }

  emailContent += `<p>
    Keep improving your profile and apply to similar positions.
    We believe in your potential! 🚀
  </p>
  </div>`;

  return emailContent;
}

export default {
  generateRejectionExplanation,
  formatRejectionForEmail,
  getSHAPExplanation,
  getLIMEExplanation,
};
