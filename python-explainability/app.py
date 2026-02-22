"""
SHAP/LIME Explainability Microservice
Flask API that provides model explanations using SHAP and LIME
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import shap
from lime import lime_tabular
from sklearn.neural_network import MLPRegressor
import pickle
import os
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for Node.js communication

# Global model and explainer instances
model = None
shap_explainer = None
lime_explainer = None
feature_names = ['Skills Match', 'Experience Match', 'Location Match', 'Salary Match']

# Model path
MODEL_PATH = 'trained_model.pkl'


def load_or_train_model():
    """Load existing model or train a new one"""
    global model, shap_explainer, lime_explainer

    if os.path.exists(MODEL_PATH):
        print("📥 Loading existing model...")
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
    else:
        print("🧠 Training new model...")
        model = train_model()

        # Save model
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(model, f)
        print("💾 Model saved!")

    # Initialize SHAP explainer
    print("🔧 Initializing SHAP explainer...")
    shap_explainer = shap.Explainer(model.predict, generate_background_data())

    # Initialize LIME explainer
    print("🔧 Initializing LIME explainer...")
    lime_explainer = lime_tabular.LimeTabularExplainer(
        generate_background_data(),
        feature_names=feature_names,
        mode='regression',
        verbose=False
    )

    print("✅ Explainers ready!")


def generate_training_data(n_samples=1000):
    """Generate synthetic training data matching the JavaScript model"""
    X = []
    y = []

    for _ in range(n_samples):
        # Random match scores (0-1 range)
        skills = np.random.random()
        experience = np.random.random()
        location = np.random.random()
        salary = np.random.random()

        # Calculate weighted overall score (same weights as JavaScript)
        overall_score = (
            skills * 0.50 +
            experience * 0.30 +
            location * 0.15 +
            salary * 0.05
        )

        # Determine acceptance probability (same logic as JavaScript)
        if overall_score >= 0.80:
            acceptance = 0.75 + (np.random.random() * 0.20)
        elif overall_score >= 0.60:
            acceptance = 0.45 + (np.random.random() * 0.30)
        elif overall_score >= 0.40:
            acceptance = 0.15 + (np.random.random() * 0.30)
        else:
            acceptance = 0.05 + (np.random.random() * 0.15)

        # Skills boost/penalty
        if skills >= 0.90:
            acceptance = min(acceptance + 0.15, 0.98)
        elif skills < 0.30:
            acceptance = max(acceptance - 0.20, 0.02)

        X.append([skills, experience, location, salary])
        y.append(np.clip(acceptance, 0, 1))

    return np.array(X), np.array(y)


def generate_background_data(n_samples=100):
    """Generate background data for SHAP"""
    X, _ = generate_training_data(n_samples)
    return X


def train_model():
    """Train a neural network model matching JavaScript architecture"""
    print("📊 Generating training data...")
    X_train, y_train = generate_training_data(1000)

    print("🔄 Training neural network...")
    # MLPRegressor with similar architecture to JavaScript (4-8-1)
    model = MLPRegressor(
        hidden_layer_sizes=(8,),
        activation='logistic',  # Sigmoid
        solver='sgd',
        learning_rate_init=0.01,
        max_iter=10000,
        random_state=42,
        verbose=True
    )

    model.fit(X_train, y_train)
    print("✅ Training complete!")

    return model


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'SHAP/LIME Explainability Service',
        'model_loaded': model is not None
    })


@app.route('/explain/shap', methods=['POST'])
def shap_explanation():
    """
    Generate SHAP explanation for a prediction

    Expected input:
    {
        "skills": 0.65,
        "experience": 0.50,
        "location": 0.80,
        "salary": 0.60
    }

    Returns SHAP values and feature importance
    """
    try:
        data = request.json

        # Extract features (0-1 range)
        features = np.array([[
            data.get('skills', 0) / 100.0,
            data.get('experience', 0) / 100.0,
            data.get('location', 0) / 100.0,
            data.get('salary', 0) / 100.0
        ]])

        # Get prediction
        prediction = model.predict(features)[0]

        # Calculate SHAP values
        shap_values = shap_explainer(features)

        # Get base value (expected value)
        base_value = shap_values.base_values[0] if hasattr(shap_values.base_values, '__iter__') else shap_values.base_values

        # Get SHAP values for this prediction
        feature_shaps = shap_values.values[0].tolist()

        # Calculate feature contributions (in percentage points)
        contributions = [val * 100 for val in feature_shaps]

        # Sort features by absolute importance
        importance_order = sorted(
            range(len(contributions)),
            key=lambda i: abs(contributions[i]),
            reverse=True
        )

        return jsonify({
            'success': True,
            'prediction': float(prediction * 100),  # Convert to percentage
            'baseValue': float(base_value * 100),
            'shapValues': feature_shaps,
            'contributions': contributions,
            'features': [
                {
                    'name': feature_names[i],
                    'value': float(features[0][i] * 100),
                    'shapValue': feature_shaps[i],
                    'contribution': contributions[i],
                    'importance': abs(contributions[i])
                }
                for i in importance_order
            ],
            'explanation': generate_text_explanation(feature_names, contributions, importance_order)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/explain/lime', methods=['POST'])
def lime_explanation():
    """
    Generate LIME explanation for a prediction

    Same input format as SHAP endpoint
    Returns local linear approximation
    """
    try:
        data = request.json

        # Extract features (0-1 range)
        features = np.array([[
            data.get('skills', 0) / 100.0,
            data.get('experience', 0) / 100.0,
            data.get('location', 0) / 100.0,
            data.get('salary', 0) / 100.0
        ]])

        # Get prediction
        prediction = model.predict(features)[0]

        # Generate LIME explanation
        exp = lime_explainer.explain_instance(
            features[0],
            model.predict,
            num_features=4
        )

        # Get feature contributions from LIME
        lime_values = dict(exp.as_list())
        contributions = []

        for i, feature_name in enumerate(feature_names):
            # LIME returns feature ranges as keys, extract contribution
            contrib = 0
            for key, value in lime_values.items():
                if feature_name.lower() in key.lower():
                    contrib = value * 100  # Convert to percentage points
                    break
            contributions.append(contrib)

        # Sort by importance
        importance_order = sorted(
            range(len(contributions)),
            key=lambda i: abs(contributions[i]),
            reverse=True
        )

        return jsonify({
            'success': True,
            'prediction': float(prediction * 100),
            'contributions': contributions,
            'features': [
                {
                    'name': feature_names[i],
                    'value': float(features[0][i] * 100),
                    'contribution': contributions[i],
                    'importance': abs(contributions[i])
                }
                for i in importance_order
            ],
            'explanation': generate_text_explanation(feature_names, contributions, importance_order),
            'intercept': float(exp.intercept[0] * 100)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/explain/combined', methods=['POST'])
def combined_explanation():
    """
    Get both SHAP and LIME explanations in one call
    More efficient for comprehensive analysis
    """
    try:
        # Get SHAP explanation
        shap_result = shap_explanation()
        shap_data = json.loads(shap_result.get_data())

        # Get LIME explanation
        lime_result = lime_explanation()
        lime_data = json.loads(lime_result.get_data())

        return jsonify({
            'success': True,
            'shap': shap_data,
            'lime': lime_data,
            'comparison': {
                'agreement': calculate_agreement(
                    shap_data.get('contributions', []),
                    lime_data.get('contributions', [])
                ),
                'message': 'SHAP shows global feature importance, LIME shows local approximation'
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def generate_text_explanation(feature_names, contributions, importance_order):
    """Generate human-readable explanation"""
    explanations = []

    for i in importance_order[:3]:  # Top 3 features
        name = feature_names[i]
        contrib = contributions[i]

        if contrib > 5:
            explanations.append(f"✅ {name} strongly increases acceptance (+{contrib:.1f}%)")
        elif contrib > 0:
            explanations.append(f"✅ {name} slightly increases acceptance (+{contrib:.1f}%)")
        elif contrib < -5:
            explanations.append(f"❌ {name} significantly decreases acceptance ({contrib:.1f}%)")
        elif contrib < 0:
            explanations.append(f"⚠️ {name} slightly decreases acceptance ({contrib:.1f}%)")
        else:
            explanations.append(f"➖ {name} has minimal impact (~0%)")

    return " • ".join(explanations)


def calculate_agreement(shap_contribs, lime_contribs):
    """Calculate agreement between SHAP and LIME (correlation)"""
    if not shap_contribs or not lime_contribs:
        return 0.0

    # Calculate correlation coefficient
    shap_arr = np.array(shap_contribs)
    lime_arr = np.array(lime_contribs)

    correlation = np.corrcoef(shap_arr, lime_arr)[0, 1]
    return float(correlation)


@app.route('/retrain', methods=['POST'])
def retrain_model():
    """Retrain the model with new data"""
    try:
        global model
        model = train_model()

        # Save model
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(model, f)

        # Reinitialize explainers
        load_or_train_model()

        return jsonify({
            'success': True,
            'message': 'Model retrained successfully'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("🚀 Starting SHAP/LIME Explainability Service...")
    print("="*50)

    # Load or train model on startup
    load_or_train_model()

    print("="*50)
    print("✅ Service ready!")
    print("📡 Listening on http://localhost:5001")
    print("="*50)

    # Run Flask app
    app.run(host='0.0.0.0', port=5001, debug=True)
