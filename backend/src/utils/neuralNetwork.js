class NeuralNetwork {
  constructor(config = {}) {
    this.inputSize = config.inputSize || 4; // 4 match scores
    this.hiddenSize = config.hiddenSize || 8;
    this.outputSize = config.outputSize || 1; // acceptance probability
    this.learningRate = config.learningRate || 0.01;

    this.weightsInputHidden = this.initializeWeights(this.inputSize, this.hiddenSize);
    this.weightsHiddenOutput = this.initializeWeights(this.hiddenSize, this.outputSize);

    this.biasHidden = new Array(this.hiddenSize).fill(0).map(() => Math.random() * 0.2 - 0.1);
    this.biasOutput = new Array(this.outputSize).fill(0).map(() => Math.random() * 0.2 - 0.1);
  }

  initializeWeights(rows, cols) {
    const weights = [];
    for (let i = 0; i < rows; i++) {
      weights[i] = [];
      for (let j = 0; j < cols; j++) {
        // Xavier initialization: scale by 1/sqrt(fan-in) to keep activations stable
        weights[i][j] = (Math.random() * 2 - 1) / Math.sqrt(rows);
      }
    }
    return weights;
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  // Derivative expressed in terms of the already-activated output
  sigmoidDerivative(x) {
    return x * (1 - x);
  }

  forward(input) {
    const hiddenLayerInput = [];
    for (let i = 0; i < this.hiddenSize; i++) {
      let sum = this.biasHidden[i];
      for (let j = 0; j < this.inputSize; j++) {
        sum += input[j] * this.weightsInputHidden[j][i];
      }
      hiddenLayerInput.push(sum);
    }

    const hiddenLayerOutput = hiddenLayerInput.map(x => this.sigmoid(x));

    const outputLayerInput = [];
    for (let i = 0; i < this.outputSize; i++) {
      let sum = this.biasOutput[i];
      for (let j = 0; j < this.hiddenSize; j++) {
        sum += hiddenLayerOutput[j] * this.weightsHiddenOutput[j][i];
      }
      outputLayerInput.push(sum);
    }

    const output = outputLayerInput.map(x => this.sigmoid(x));

    return {
      hiddenLayerOutput,
      output,
    };
  }

  backward(input, targetOutput, forwardResult) {
    const { hiddenLayerOutput, output } = forwardResult;

    const outputError = targetOutput - output[0];
    const outputDelta = outputError * this.sigmoidDerivative(output[0]);

    // Backpropagate output delta through hidden->output weights
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

    // Gradient descent weight/bias updates
    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.outputSize; j++) {
        this.weightsHiddenOutput[i][j] += this.learningRate * outputDelta * hiddenLayerOutput[i];
      }
    }

    for (let i = 0; i < this.inputSize; i++) {
      for (let j = 0; j < this.hiddenSize; j++) {
        this.weightsInputHidden[i][j] += this.learningRate * hiddenDelta[j] * input[i];
      }
    }

    for (let i = 0; i < this.outputSize; i++) {
      this.biasOutput[i] += this.learningRate * outputDelta;
    }

    for (let i = 0; i < this.hiddenSize; i++) {
      this.biasHidden[i] += this.learningRate * hiddenDelta[i];
    }

    return Math.abs(outputError);
  }

  train(trainingData, epochs = 1000) {
    let totalError = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      totalError = 0;

      // Shuffle each epoch so weight updates don't follow a fixed sample order
      const shuffled = trainingData.sort(() => Math.random() - 0.5);

      for (const data of shuffled) {
        const forwardResult = this.forward(data.input);
        const error = this.backward(data.input, data.output, forwardResult);
        totalError += error;
      }

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

  predict(input) {
    const result = this.forward(input);
    return result.output[0];
  }

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
