import axios from 'axios';

const PYTHON_SERVICE_URL = process.env.PYTHON_EXPLAINABILITY_URL || 'http://localhost:5001';

const pythonAPI = axios.create({
  baseURL: PYTHON_SERVICE_URL,
  timeout: 60000, // BERT embeddings + SHAP/LIME can take tens of seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

function buildPayload(matchBreakdown, textData = {}) {
  const payload = {
    skills: matchBreakdown.skills?.score || 0,
    experience: matchBreakdown.experience?.score || 0,
    location: matchBreakdown.location?.score || 0,
    salary: matchBreakdown.salary?.score || 0,
  };

  if (textData.resumeText) {
    payload.resume_text = textData.resumeText;
  }
  if (textData.jobDescription) {
    payload.job_description = textData.jobDescription;
  }

  return payload;
}

export async function isPythonServiceHealthy() {
  try {
    const response = await pythonAPI.get('/health');
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('❌ Python BERT service is not reachable:', error.message);
    return false;
  }
}

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
    return getFallbackExplanation(matchBreakdown);
  }
}

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

function getFallbackExplanation(matchBreakdown) {
  const scores = {
    skills: matchBreakdown.skills?.score || 0,
    experience: matchBreakdown.experience?.score || 0,
    location: matchBreakdown.location?.score || 0,
    salary: matchBreakdown.salary?.score || 0,
  };

  // Fallback weights must match jobMatching.js (the BERT service uses different hybrid weights)
  const contributions = {
    skills: (scores.skills - 50) * 0.50,
    experience: (scores.experience - 50) * 0.35,
    location: (scores.location - 50) * 0.10,
    salary: (scores.salary - 50) * 0.05,
  };

  const features = Object.entries(contributions)
    .map(([name, contribution]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1) + ' Match',
      value: scores[name],
      contribution: contribution,
      importance: Math.abs(contribution),
    }))
    .sort((a, b) => b.importance - a.importance);

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
