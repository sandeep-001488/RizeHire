/**
 * Simple Neural Network Implementation in Pure JavaScript
 * No external dependencies required!
 *
 * 2-layer feedforward neural network with backpropagation
 * Perfect for job application acceptance prediction
 */

class NeuralNetwork {
  constructor(config = {}) {
    this.inputSize = config.inputSize || 4; // 4 match scores
    this.hiddenSize = config.hiddenSize || 8; // Hidden layer neurons
    this.outputSize = config.outputSize || 1; // Acceptance probability
    this.learningRate = config.learningRate || 0.01;

    // Initialize weights with random values (-1 to 1)
    this.weightsInputHidden = this.initializeWeights(this.inputSize, this.hiddenSize);
    this.weightsHiddenOutput = this.initializeWeights(this.hiddenSize, this.outputSize);

    // Initialize biases
    this.biasHidden = new Array(this.hiddenSize).fill(0).map(() => Math.random() * 0.2 - 0.1);
    this.biasOutput = new Array(this.outputSize).fill(0).map(() => Math.random() * 0.2 - 0.1);
  }

  /**
   * Initialize weights with small random values
   */
  initializeWeights(rows, cols) {
    const weights = [];
    for (let i = 0; i < rows; i++) {
      weights[i] = [];
      for (let j = 0; j < cols; j++) {
        // Xavier initialization
        weights[i][j] = (Math.random() * 2 - 1) / Math.sqrt(rows);
      }
    }
    return weights;
  }

  /**
   * Sigmoid activation function
   */
  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Derivative of sigmoid (for backpropagation)
   */
  sigmoidDerivative(x) {
    return x * (1 - x);
  }

  /**
   * Forward propagation
   * @param {Array} input - Input features [skillsMatch, experienceMatch, locationMatch, salaryMatch]
   * @returns {Object} - Activations at each layer
   */
  forward(input) {
    // Input layer to hidden layer
    const hiddenLayerInput = [];
    for (let i = 0; i < this.hiddenSize; i++) {
      let sum = this.biasHidden[i];
      for (let j = 0; j < this.inputSize; j++) {
        sum += input[j] * this.weightsInputHidden[j][i];
      }
      hiddenLayerInput.push(sum);
    }

    // Apply activation function
    const hiddenLayerOutput = hiddenLayerInput.map(x => this.sigmoid(x));

    // Hidden layer to output layer
    const outputLayerInput = [];
    for (let i = 0; i < this.outputSize; i++) {
      let sum = this.biasOutput[i];
      for (let j = 0; j < this.hiddenSize; j++) {
        sum += hiddenLayerOutput[j] * this.weightsHiddenOutput[j][i];
      }
      outputLayerInput.push(sum);
    }

    // Apply activation function
    const output = outputLayerInput.map(x => this.sigmoid(x));

    return {
      hiddenLayerOutput,
      output,
    };
  }

  /**
   * Backward propagation (learning)
   * @param {Array} input - Input features
   * @param {Number} targetOutput - Expected output
   * @param {Object} forwardResult - Result from forward pass
   */
  backward(input, targetOutput, forwardResult) {
    const { hiddenLayerOutput, output } = forwardResult;

    // Calculate output layer error
    const outputError = targetOutput - output[0];
    const outputDelta = outputError * this.sigmoidDerivative(output[0]);

    // Calculate hidden layer error
    const hiddenError = [];
    for (let i = 0; i < this.hiddenSize; i++) {
      let error = 0;
      for (let j = 0; j < this.outputSize; j++) {
        error += outputDelta * this.weightsHiddenOutput[i][j];
      }
      hiddenError.push(error);
    }

    const hiddenDelta = hiddenError.map((error, i) =>
      error * this.sigmoidDerivative(hiddenLayerOutput[i])
    );

    // Update weights and biases (gradient descent)
    // Hidden to output
    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.outputSize; j++) {
        this.weightsHiddenOutput[i][j] += this.learningRate * outputDelta * hiddenLayerOutput[i];
      }
    }

    // Input to hidden
    for (let i = 0; i < this.inputSize; i++) {
      for (let j = 0; j < this.hiddenSize; j++) {
        this.weightsInputHidden[i][j] += this.learningRate * hiddenDelta[j] * input[i];
      }
    }

    // Update biases
    for (let i = 0; i < this.outputSize; i++) {
      this.biasOutput[i] += this.learningRate * outputDelta;
    }

    for (let i = 0; i < this.hiddenSize; i++) {
      this.biasHidden[i] += this.learningRate * hiddenDelta[i];
    }

    return Math.abs(outputError);
  }

  /**
   * Train the network
   * @param {Array} trainingData - Array of {input, output} pairs
   * @param {Number} epochs - Number of training iterations
   */
  train(trainingData, epochs = 1000) {
    let totalError = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      totalError = 0;

      // Shuffle training data for better learning
      const shuffled = trainingData.sort(() => Math.random() - 0.5);

      for (const data of shuffled) {
        const forwardResult = this.forward(data.input);
        const error = this.backward(data.input, data.output, forwardResult);
        totalError += error;
      }

      // Log progress every 1000 epochs
      if ((epoch + 1) % 1000 === 0) {
        const avgError = totalError / trainingData.length;
        console.log(`Epoch ${epoch + 1}/${epochs}, Avg Error: ${avgError.toFixed(6)}`);
      }
    }

    return {
      finalError: totalError / trainingData.length,
      epochs,
    };
  }

  /**
   * Predict output for given input
   * @param {Array} input - Input features
   * @returns {Number} - Predicted output
   */
  predict(input) {
    const result = this.forward(input);
    return result.output[0];
  }

  /**
   * Serialize network to JSON
   */
  toJSON() {
    return {
      config: {
        inputSize: this.inputSize,
        hiddenSize: this.hiddenSize,
        outputSize: this.outputSize,
        learningRate: this.learningRate,
      },
      weights: {
        inputHidden: this.weightsInputHidden,
        hiddenOutput: this.weightsHiddenOutput,
      },
      biases: {
        hidden: this.biasHidden,
        output: this.biasOutput,
      },
    };
  }

  /**
   * Load network from JSON
   */
  fromJSON(json) {
    this.inputSize = json.config.inputSize;
    this.hiddenSize = json.config.hiddenSize;
    this.outputSize = json.config.outputSize;
    this.learningRate = json.config.learningRate;
    this.weightsInputHidden = json.weights.inputHidden;
    this.weightsHiddenOutput = json.weights.hiddenOutput;
    this.biasHidden = json.biases.hidden;
    this.biasOutput = json.biases.output;
  }
}

export default NeuralNetwork;
