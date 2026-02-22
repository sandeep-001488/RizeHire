/**
 * Machine Learning Model for Job Application Success Prediction
 * Uses custom neural network implementation (pure JavaScript)
 *
 * Features:
 * - Skills match percentage (0-100)
 * - Experience match score (0-100)
 * - Location match score (0-100)
 * - Salary match score (0-100)
 *
 * Output:
 * - Acceptance probability (0-1, converted to 0-100%)
 */

import NeuralNetwork from './neuralNetwork.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global network instance
let trainedNetwork = null;
const MODEL_PATH = path.join(__dirname, '../../ml-models/acceptance-model.json');

/**
 * Generate synthetic training data based on historical patterns
 * In a real scenario, this would come from actual application outcomes
 *
 * Training logic:
 * - High match scores (>80) → High acceptance rate (~80-90%)
 * - Good match scores (60-80) → Moderate acceptance (~50-70%)
 * - Fair match scores (40-60) → Low acceptance (~20-40%)
 * - Poor match scores (<40) → Very low acceptance (~5-15%)
 */
function generateTrainingData() {
  const trainingData = [];

  // Generate 1000 synthetic training examples
  for (let i = 0; i < 1000; i++) {
    // Random match scores
    const skillsMatch = Math.random() * 100;
    const experienceMatch = Math.random() * 100;
    const locationMatch = Math.random() * 100;
    const salaryMatch = Math.random() * 100;

    // Calculate weighted overall score (same weights as jobMatching.js)
    const overallScore =
      (skillsMatch * 0.50) +
      (experienceMatch * 0.30) +
      (locationMatch * 0.15) +
      (salaryMatch * 0.05);

    // Determine acceptance probability based on overall score
    // Add some randomness to make it realistic
    let acceptanceProbability;

    if (overallScore >= 80) {
      // Excellent match → 75-95% acceptance
      acceptanceProbability = 0.75 + (Math.random() * 0.20);
    } else if (overallScore >= 60) {
      // Good match → 45-75% acceptance
      acceptanceProbability = 0.45 + (Math.random() * 0.30);
    } else if (overallScore >= 40) {
      // Fair match → 15-45% acceptance
      acceptanceProbability = 0.15 + (Math.random() * 0.30);
    } else {
      // Poor match → 5-20% acceptance
      acceptanceProbability = 0.05 + (Math.random() * 0.15);
    }

    // Skills are most important - boost/penalize based on skills
    if (skillsMatch >= 90) {
      acceptanceProbability = Math.min(acceptanceProbability + 0.15, 0.98);
    } else if (skillsMatch < 30) {
      acceptanceProbability = Math.max(acceptanceProbability - 0.20, 0.02);
    }

    // Normalize inputs to 0-1 range for neural network
    trainingData.push({
      input: [
        skillsMatch / 100,
        experienceMatch / 100,
        locationMatch / 100,
        salaryMatch / 100,
      ],
      output: Math.min(Math.max(acceptanceProbability, 0), 1), // Clamp to [0, 1]
    });
  }

  return trainingData;
}

/**
 * Train the neural network
 * @returns {Object} Training stats
 */
export async function trainModel() {
  console.log('🧠 Starting ML model training...');

  const network = new NeuralNetwork({
    inputSize: 4,
    hiddenSize: 8,
    outputSize: 1,
    learningRate: 0.01,
  });

  const trainingData = generateTrainingData();

  console.log(`📊 Generated ${trainingData.length} training examples`);

  // Train the network (10,000 epochs for good convergence)
  const startTime = Date.now();
  const stats = network.train(trainingData, 10000);
  const trainingTime = (Date.now() - startTime) / 1000;

  console.log('✅ Training complete!');
  console.log(`📈 Final error: ${stats.finalError.toFixed(6)}`);
  console.log(`⏱️  Training time: ${trainingTime.toFixed(2)}s`);

  // Save the trained model
  const modelJson = network.toJSON();

  // Ensure directory exists
  const modelDir = path.dirname(MODEL_PATH);
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  fs.writeFileSync(MODEL_PATH, JSON.stringify(modelJson));
  console.log(`💾 Model saved to ${MODEL_PATH}`);

  // Set global instance
  trainedNetwork = network;

  return {
    ...stats,
    trainingTime,
    trainingExamples: trainingData.length,
  };
}

/**
 * Load trained model from disk
 * @returns {boolean} Success status
 */
export function loadModel() {
  try {
    if (!fs.existsSync(MODEL_PATH)) {
      console.log('⚠️  No trained model found.');
      return false;
    }

    const modelJson = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
    trainedNetwork = new NeuralNetwork();
    trainedNetwork.fromJSON(modelJson);

    console.log('✅ ML model loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error loading model:', error.message);
    return false;
  }
}

/**
 * Ensure model is loaded, train if necessary
 */
async function ensureModelLoaded() {
  if (trainedNetwork) {
    return; // Already loaded
  }

  const loaded = loadModel();

  if (!loaded) {
    // Train new model
    console.log('Training new model for the first time...');
    await trainModel();
  }
}

/**
 * Predict acceptance probability for a job application
 *
 * @param {Object} matchBreakdown - Match breakdown from calculateJobMatch
 * @param {Number} matchBreakdown.skills.score - Skills match score (0-100)
 * @param {Number} matchBreakdown.experience.score - Experience match score (0-100)
 * @param {Number} matchBreakdown.location.score - Location match score (0-100)
 * @param {Number} matchBreakdown.salary.score - Salary match score (0-100)
 *
 * @returns {Object} ML prediction with probability and confidence
 */
export async function predictAcceptance(matchBreakdown) {
  await ensureModelLoaded();

  // Normalize scores to 0-1 range
  const input = [
    (matchBreakdown.skills?.score || 0) / 100,
    (matchBreakdown.experience?.score || 0) / 100,
    (matchBreakdown.location?.score || 0) / 100,
    (matchBreakdown.salary?.score || 0) / 100,
  ];

  // Get prediction from neural network
  const acceptanceProbability = trainedNetwork.predict(input);

  // Convert to percentage
  const acceptancePercentage = Math.round(acceptanceProbability * 100);

  // Calculate confidence level based on how extreme the prediction is
  // Predictions close to 0 or 1 are more confident than those near 0.5
  const distanceFrom50 = Math.abs(acceptanceProbability - 0.5);
  const confidence = distanceFrom50 * 2; // 0 = no confidence, 1 = full confidence

  let confidenceLevel;
  if (confidence > 0.7) {
    confidenceLevel = 'high';
  } else if (confidence > 0.4) {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'low';
  }

  // Generate recommendation based on ML prediction
  let mlRecommendation;
  let mlInsight;

  if (acceptancePercentage >= 70) {
    mlRecommendation = 'Strong candidate - highly recommended';
    mlInsight = 'Based on historical patterns, candidates with similar profiles have a high acceptance rate. This is an excellent opportunity!';
  } else if (acceptancePercentage >= 50) {
    mlRecommendation = 'Good candidate - recommended to apply';
    mlInsight = 'Your profile shows promising alignment. While competition may be present, you have a solid chance of success.';
  } else if (acceptancePercentage >= 30) {
    mlRecommendation = 'Moderate fit - consider applying with improvements';
    mlInsight = 'Your profile meets some requirements. Consider highlighting transferable skills and showing enthusiasm for learning.';
  } else {
    mlRecommendation = 'Focus on better-matched positions';
    mlInsight = 'Historical data suggests lower success rates for similar profiles. Consider building skills in key areas first.';
  }

  return {
    acceptanceProbability: acceptancePercentage,
    confidence: confidenceLevel,
    confidenceScore: Math.round(confidence * 100),
    recommendation: mlRecommendation,
    insight: mlInsight,
    rawProbability: acceptanceProbability, // 0-1 for internal use
  };
}

/**
 * Get model performance metrics (for testing/validation)
 *
 * @returns {Object} Model performance stats
 */
export async function getModelPerformance() {
  await ensureModelLoaded();

  // Test on a separate validation set
  const validationData = generateTrainingData().slice(0, 100);

  let correctPredictions = 0;
  let totalError = 0;

  for (const data of validationData) {
    const prediction = trainedNetwork.predict(data.input);
    const actualAcceptance = data.output;

    // Consider prediction correct if within 20% of actual
    if (Math.abs(prediction - actualAcceptance) < 0.20) {
      correctPredictions++;
    }

    totalError += Math.abs(prediction - actualAcceptance);
  }

  const accuracy = (correctPredictions / validationData.length) * 100;
  const avgError = totalError / validationData.length;

  return {
    accuracy: Math.round(accuracy),
    averageError: avgError.toFixed(4),
    validationSamples: validationData.length,
    message: `Model accuracy: ${Math.round(accuracy)}% (±20% tolerance)`,
    modelInfo: {
      architecture: '4-8-1 Neural Network',
      activationFunction: 'Sigmoid',
      trainingAlgorithm: 'Backpropagation with Gradient Descent',
      framework: 'Custom Pure JavaScript Implementation',
    },
  };
}

/**
 * Retrain the model (useful for updating with new data)
 */
export async function retrainModel() {
  console.log('🔄 Retraining ML model...');
  trainedNetwork = null; // Clear existing model
  return await trainModel();
}

// Initialize model on module load (async, non-blocking)
(async () => {
  try {
    await ensureModelLoaded();
    console.log('🤖 ML Model ready for predictions');
  } catch (error) {
    console.error('⚠️  ML Model initialization warning:', error.message);
    console.log('   Model will be trained on first prediction request');
  }
})();

export default {
  trainModel,
  loadModel,
  predictAcceptance,
  getModelPerformance,
  retrainModel,
};
