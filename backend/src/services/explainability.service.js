/**
 * Explainability Service
 * Communicates with Python BERT + SHAP/LIME microservice
 *
 * Uses Sentence-BERT (all-MiniLM-L6-v2) for semantic matching
 * with SHAP and LIME for model explainability
 */

import axios from 'axios';

const PYTHON_SERVICE_URL = process.env.PYTHON_EXPLAINABILITY_URL || 'http://localhost:5001';

// Axios instance for Python service
const pythonAPI = axios.create({
  baseURL: PYTHON_SERVICE_URL,
  timeout: 60000, // 60 seconds (BERT embeddings + SHAP/LIME can be slow)
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Build the payload for Python BERT service
 * Includes both text data (for BERT semantic matching) and scores (for hybrid prediction)
 *
 * @param {Object} matchBreakdown - Match scores from jobMatching.js
 * @param {Object} textData - Optional text data for BERT mode
 * @param {string} textData.resumeText - Candidate resume text/summary
 * @param {string} textData.jobDescription - Job description text
 * @returns {Object} Payload for Python service
 */
function buildPayload(matchBreakdown, textData = {}) {
  const payload = {
    skills: matchBreakdown.skills?.score || 0,
    experience: matchBreakdown.experience?.score || 0,
    location: matchBreakdown.location?.score || 0,
    salary: matchBreakdown.salary?.score || 0,
  };

  // Include text data for full BERT semantic matching mode
  if (textData.resumeText) {
    payload.resume_text = textData.resumeText;
  }
  if (textData.jobDescription) {
    payload.job_description = textData.jobDescription;
  }

  return payload;
}

/**
 * Check if Python service is healthy
 * @returns {Promise<boolean>}
 */
export async function isPythonServiceHealthy() {
  try {
    const response = await pythonAPI.get('/health');
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('❌ Python BERT service is not reachable:', error.message);
    return false;
  }
}

/**
 * Get SHAP explanation for a prediction
 *
 * @param {Object} matchBreakdown - Match scores from jobMatching.js
 * @param {Object} textData - Optional text data for BERT semantic matching
 * @param {string} textData.resumeText - Candidate resume text
 * @param {string} textData.jobDescription - Job description text
 * @returns {Promise<Object>} SHAP explanation
 */
export async function getSHAPExplanation(matchBreakdown, textData = {}) {
  try {
    const payload = buildPayload(matchBreakdown, textData);
    const response = await pythonAPI.post('/explain/shap', payload);

    if (!response.data.success) {
      throw new Error(response.data.error || 'SHAP explanation failed');
    }

    return {
      success: true,
      type: 'SHAP',
      prediction: response.data.prediction,
      baseValue: response.data.baseValue,
      features: response.data.features,
      explanation: response.data.explanation,
      shapValues: response.data.shapValues,
      contributions: response.data.contributions,
    };
  } catch (error) {
    console.error('❌ SHAP explanation error:', error.message);

    // Return fallback explanation if Python service fails
    return getFallbackExplanation(matchBreakdown);
  }
}

/**
 * Get LIME explanation for a prediction
 *
 * @param {Object} matchBreakdown - Match scores
 * @param {Object} textData - Optional text data for BERT semantic matching
 * @returns {Promise<Object>} LIME explanation
 */
export async function getLIMEExplanation(matchBreakdown, textData = {}) {
  try {
    const payload = buildPayload(matchBreakdown, textData);
    const response = await pythonAPI.post('/explain/lime', payload);

    if (!response.data.success) {
      throw new Error(response.data.error || 'LIME explanation failed');
    }

    return {
      success: true,
      type: 'LIME',
      prediction: response.data.prediction,
      features: response.data.features,
      explanation: response.data.explanation,
      intercept: response.data.intercept,
    };
  } catch (error) {
    console.error('❌ LIME explanation error:', error.message);
    return getFallbackExplanation(matchBreakdown);
  }
}

/**
 * Get combined SHAP + LIME explanation
 * More comprehensive but slower
 *
 * @param {Object} matchBreakdown - Match scores
 * @param {Object} textData - Optional text data for BERT semantic matching
 * @returns {Promise<Object>} Combined explanation
 */
export async function getCombinedExplanation(matchBreakdown, textData = {}) {
  try {
    const payload = buildPayload(matchBreakdown, textData);
    const response = await pythonAPI.post('/explain/combined', payload);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Combined explanation failed');
    }

    return {
      success: true,
      shap: response.data.shap,
      lime: response.data.lime,
      comparison: response.data.comparison,
    };
  } catch (error) {
    console.error('❌ Combined explanation error:', error.message);
    return {
      success: false,
      fallback: getFallbackExplanation(matchBreakdown),
    };
  }
}

/**
 * Fallback explanation if Python service is unavailable
 * Uses simple rule-based logic similar to SHAP
 *
 * @param {Object} matchBreakdown - Match scores
 * @returns {Object} Fallback explanation
 */
function getFallbackExplanation(matchBreakdown) {
  const scores = {
    skills: matchBreakdown.skills?.score || 0,
    experience: matchBreakdown.experience?.score || 0,
    location: matchBreakdown.location?.score || 0,
    salary: matchBreakdown.salary?.score || 0,
  };

  // Calculate weighted contributions (aligned with jobMatching.js weights)
  // Note: When BERT service is available, it uses BERT 40% + Skills 30% + Exp 15% + Loc 10% + Sal 5%
  // Fallback uses traditional-only weights from jobMatching.js
  const contributions = {
    skills: (scores.skills - 50) * 0.50,      // 50% weight (matches jobMatching.js)
    experience: (scores.experience - 50) * 0.35, // 35% weight (matches jobMatching.js)
    location: (scores.location - 50) * 0.10,   // 10% weight (matches jobMatching.js)
    salary: (scores.salary - 50) * 0.05,       // 5% weight (matches jobMatching.js)
  };

  // Sort by absolute importance
  const features = Object.entries(contributions)
    .map(([name, contribution]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1) + ' Match',
      value: scores[name],
      contribution: contribution,
      importance: Math.abs(contribution),
    }))
    .sort((a, b) => b.importance - a.importance);

  // Generate explanation
  const explanations = features
    .slice(0, 3)
    .map((f) => {
      if (f.contribution > 5)
        return `✅ ${f.name} strongly increases acceptance (+${f.contribution.toFixed(1)}%)`;
      if (f.contribution > 0)
        return `✅ ${f.name} slightly increases acceptance (+${f.contribution.toFixed(1)}%)`;
      if (f.contribution < -5)
        return `❌ ${f.name} significantly decreases acceptance (${f.contribution.toFixed(1)}%)`;
      if (f.contribution < 0)
        return `⚠️ ${f.name} slightly decreases acceptance (${f.contribution.toFixed(1)}%)`;
      return `➖ ${f.name} has minimal impact (~0%)`;
    })
    .join(' • ');

  return {
    success: true,
    type: 'Fallback',
    prediction: 50 + Object.values(contributions).reduce((sum, val) => sum + val, 0),
    baseValue: 50,
    features,
    explanation: explanations,
    note: 'Using fallback explanation (Python service unavailable)',
  };
}

/**
 * Get feature importance summary (for quick display)
 *
 * @param {Object} matchBreakdown - Match scores
 * @returns {Promise<Array>} Feature importance array
 */
export async function getFeatureImportance(matchBreakdown) {
  try {
    const explanation = await getSHAPExplanation(matchBreakdown);
    return explanation.features.map((f) => ({
      feature: f.name,
      importance: f.importance,
      impact: f.contribution > 0 ? 'positive' : f.contribution < 0 ? 'negative' : 'neutral',
    }));
  } catch (error) {
    console.error('❌ Feature importance error:', error.message);
    return [];
  }
}

export default {
  isPythonServiceHealthy,
  getSHAPExplanation,
  getLIMEExplanation,
  getCombinedExplanation,
  getFeatureImportance,
};
