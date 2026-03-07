/**
 * Machine Learning Model for Job Application Success Prediction
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

function generateTrainingData() {
  const trainingData = [];

  for (let i = 0; i < 1000; i++) {
    const skillsMatch = Math.random() * 100;
    const experienceMatch = Math.random() * 100;
    const locationMatch = Math.random() * 100;
    const salaryMatch = Math.random() * 100;

    const overallScore =
      (skillsMatch * 0.50) +
      (experienceMatch * 0.30) +
      (locationMatch * 0.15) +
      (salaryMatch * 0.05);

    let acceptanceProbability;

    if (overallScore >= 80) {
      acceptanceProbability = 0.75 + (Math.random() * 0.20);
    } else if (overallScore >= 60) {
      acceptanceProbability = 0.45 + (Math.random() * 0.30);
    } else if (overallScore >= 40) {
      acceptanceProbability = 0.15 + (Math.random() * 0.30);
    } else {
      acceptanceProbability = 0.05 + (Math.random() * 0.15);
    }

    if (skillsMatch >= 90) {
      acceptanceProbability = Math.min(acceptanceProbability + 0.15, 0.98);
    } else if (skillsMatch < 30) {
      acceptanceProbability = Math.max(acceptanceProbability - 0.20, 0.02);
    }

    trainingData.push({
      input: [
        skillsMatch / 100,
        experienceMatch / 100,
        locationMatch / 100,
        salaryMatch / 100,
      ],
      output: Math.min(Math.max(acceptanceProbability, 0), 1),
    });
  }

  return trainingData;
}

function loadRealTrainingData() {
  try {
    const trainingDataPath = path.join(__dirname, '../../training_data.json');

    if (fs.existsSync(trainingDataPath)) {
      const data = JSON.parse(fs.readFileSync(trainingDataPath, 'utf8'));
      console.log(`Loaded ${data.length} training samples from dataset`);
      return data;
    }
  } catch (error) {
    console.error('Error loading training data:', error.message);
  }

  console.log('Using synthetic training data');
  return generateTrainingData();
}

export async function trainModel() {
  console.log('Training neural network model...');

  const network = new NeuralNetwork({
    inputSize: 4,
    hiddenSize: 8,
    outputSize: 1,
    learningRate: 0.01,
  });

  const trainingData = loadRealTrainingData();
  console.log(`Training with ${trainingData.length} samples`);

  const startTime = Date.now();
  const stats = network.train(trainingData, 10000);
  const trainingTime = (Date.now() - startTime) / 1000;

  console.log(`Training complete. Error: ${stats.finalError.toFixed(6)}, Time: ${trainingTime.toFixed(2)}s`);

  const modelJson = network.toJSON();

  const modelDir = path.dirname(MODEL_PATH);
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  fs.writeFileSync(MODEL_PATH, JSON.stringify(modelJson));
  console.log(`Model saved to ${MODEL_PATH}`);

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
      console.log('No trained model found');
      return false;
    }

    const modelJson = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
    trainedNetwork = new NeuralNetwork();
    trainedNetwork.fromJSON(modelJson);

    console.log('Model loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading model:', error.message);
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

export async function predictAcceptance(matchBreakdown) {
  await ensureModelLoaded();

  const input = [
    (matchBreakdown.skills?.score || 0) / 100,
    (matchBreakdown.experience?.score || 0) / 100,
    (matchBreakdown.location?.score || 0) / 100,
    (matchBreakdown.salary?.score || 0) / 100,
  ];

  const acceptanceProbability = trainedNetwork.predict(input);
  const acceptancePercentage = Math.round(acceptanceProbability * 100);

  let confidence;

  if (acceptanceProbability >= 0.4 && acceptanceProbability <= 0.6) {
    confidence = 0.6;
  } else if (acceptanceProbability >= 0.3 && acceptanceProbability <= 0.7) {
    confidence = 0.7;
  } else {
    confidence = 0.3;
  }

  let confidenceLevel;
  if (confidence > 0.6) {
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

export async function getModelPerformance() {
  await ensureModelLoaded();

  const validationData = generateTrainingData().slice(0, 100);

  let correctPredictions = 0;
  let totalError = 0;

  for (const data of validationData) {
    const prediction = trainedNetwork.predict(data.input);
    const actualAcceptance = data.output;

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

export async function retrainModel() {
  console.log('Retraining model...');
  trainedNetwork = null;
  return await trainModel();
}

(async () => {
  try {
    await ensureModelLoaded();
    console.log('Model initialized');
  } catch (error) {
    console.error('Model initialization error:', error.message);
  }
})();

export default {
  trainModel,
  loadModel,
  predictAcceptance,
  getModelPerformance,
  retrainModel,
};
