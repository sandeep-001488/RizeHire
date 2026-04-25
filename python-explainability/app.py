"""
BERT-based Resume-Job Matching with SHAP/LIME Explainability
Flask microservice that uses Sentence-BERT for semantic matching
and provides SHAP/LIME explanations for every prediction.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import torch
import torch.nn as nn
import shap
from lime import lime_tabular
from sentence_transformers import SentenceTransformer, CrossEncoder
import pickle
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# ─── Global State ───
sbert_model = None
matching_model = None       # BERTMatchingModel (bi-encoder) OR None
cross_encoder_model = None  # CrossEncoder (fine-tuned) OR None
shap_explainer = None
lime_explainer = None
background_data = None
config = {}
model_type = 'fallback'     # 'cross-encoder', 'bi-encoder', or 'fallback'

# Feature names for explainability (what SHAP/LIME will explain)
FEATURE_NAMES = [
    'Resume-Job Semantic Similarity',
    'Skills Match',
    'Experience Match',
    'Location Match',
    'Salary Match'
]

# Paths
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
BERT_MODEL_PATH = os.path.join(MODEL_DIR, 'bert_matching_model.pt')
CROSS_ENCODER_PATH = os.path.join(MODEL_DIR, 'rizehire_cross_encoder_final')
BACKGROUND_PATH = os.path.join(MODEL_DIR, 'background_data.pkl')


# ─── BERT Matching Model (must match training script architecture) ───
class BERTMatchingModel(nn.Module):
    """
    Multi-interaction dual-stream NN for resume-job matching.

    Captures 4 types of interaction:
    1. Cosine Similarity  (1-dim)    — global semantic alignment
    2. Element-wise Diff   (384-dim) — what's missing/extra
    3. Element-wise Product (384-dim) — shared concepts
    4. Concatenation        (768-dim) — full context

    Combined: 1 + 384 + 384 + 768 = 1537 → Dense layers → Match score
    """

    def __init__(self, embedding_dim=384, hidden_dim=256, dropout=0.4):
        super(BERTMatchingModel, self).__init__()

        interaction_dim = 1 + embedding_dim + embedding_dim + embedding_dim * 2

        self.network = nn.Sequential(
            nn.Linear(interaction_dim, hidden_dim),    # 1537 → 256
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),    # 256 → 128
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.Dropout(dropout * 0.6),
            nn.Linear(hidden_dim // 2, 64),            # 128 → 64
            nn.ReLU(),
            nn.BatchNorm1d(64),
            nn.Dropout(dropout * 0.4),
            nn.Linear(64, 1),                          # 64 → 1
            nn.Sigmoid()
        )

    def forward(self, resume_emb, job_emb):
        cos_sim = torch.nn.functional.cosine_similarity(resume_emb, job_emb, dim=1).unsqueeze(1)
        diff = torch.abs(resume_emb - job_emb)
        product = resume_emb * job_emb
        concat = torch.cat([resume_emb, job_emb], dim=1)
        combined = torch.cat([cos_sim, diff, product, concat], dim=1)
        return self.network(combined).squeeze()


# ─── Hybrid Prediction Function ───
def predict_match(resume_text, job_text, skills_score=50, experience_score=50,
                  location_score=50, salary_score=50):
    """
    Hybrid prediction: BERT semantic similarity + weighted factor scores.
    Returns a match probability (0-1) and the 5-feature vector used for SHAP/LIME.

    Supports three modes:
    1. Cross-encoder (best): Fine-tuned BERT processes resume+JD together
    2. Bi-encoder: Frozen S-BERT embeddings + matching network
    3. Fallback: Cosine similarity only
    """
    # 1. Get BERT semantic similarity score
    if cross_encoder_model is not None:
        # Cross-encoder: processes both texts together (most accurate)
        bert_score = float(cross_encoder_model.predict([(resume_text, job_text)])[0])
        # Clip to 0-1 range (cross-encoder outputs can be unconstrained)
        bert_score = max(0.0, min(1.0, bert_score))
    elif matching_model is not None:
        # Bi-encoder: encode separately, predict with matching network
        resume_emb = sbert_model.encode([resume_text], normalize_embeddings=True)
        job_emb = sbert_model.encode([job_text], normalize_embeddings=True)
        with torch.no_grad():
            r_tensor = torch.FloatTensor(resume_emb)
            j_tensor = torch.FloatTensor(job_emb)
            bert_score = matching_model(r_tensor, j_tensor).item()
    else:
        # Fallback: cosine similarity
        resume_emb = sbert_model.encode([resume_text], normalize_embeddings=True)
        job_emb = sbert_model.encode([job_text], normalize_embeddings=True)
        bert_score = float(np.dot(resume_emb[0], job_emb[0]))
        bert_score = max(0.0, min(1.0, bert_score))

    # 2. Normalize factor scores to 0-1
    skills_norm = skills_score / 100.0
    exp_norm = experience_score / 100.0
    loc_norm = location_score / 100.0
    sal_norm = salary_score / 100.0

    # 3. Feature vector for SHAP/LIME (5 features)
    feature_vector = np.array([bert_score, skills_norm, exp_norm, loc_norm, sal_norm])

    # 4. Final weighted prediction
    # BERT semantic score gets 40% weight, traditional factors get 60%
    final_score = (
        bert_score * 0.40 +
        skills_norm * 0.30 +
        exp_norm * 0.15 +
        loc_norm * 0.10 +
        sal_norm * 0.05
    )

    return final_score, feature_vector, bert_score


def predict_from_features(feature_matrix):
    """
    Prediction function that works with the 5-feature vector.
    Used by SHAP/LIME to perturb features and observe changes.
    """
    results = []
    for features in feature_matrix:
        bert_sim = features[0]
        skills = features[1]
        experience = features[2]
        location = features[3]
        salary = features[4]

        score = (
            bert_sim * 0.40 +
            skills * 0.30 +
            experience * 0.15 +
            location * 0.10 +
            salary * 0.05
        )
        results.append(score)
    return np.array(results)


# ─── Model Loading ───
def load_models():
    """Load S-BERT and trained matching model (cross-encoder or bi-encoder)"""
    global sbert_model, matching_model, cross_encoder_model, model_type
    global shap_explainer, lime_explainer, background_data, config

    # Load Sentence-BERT (always needed for embeddings + SHAP/LIME background)
    sbert_name = 'all-MiniLM-L6-v2'
    print(f"📥 Loading Sentence-BERT ({sbert_name})...")
    sbert_model = SentenceTransformer(sbert_name)
    print("   ✅ S-BERT loaded")

    # Try loading cross-encoder first (fine-tuned, best accuracy)
    if os.path.exists(CROSS_ENCODER_PATH) and os.path.isdir(CROSS_ENCODER_PATH):
        print("📥 Loading fine-tuned Cross-Encoder model...")
        try:
            cross_encoder_model = CrossEncoder(CROSS_ENCODER_PATH, max_length=512)
            model_type = 'cross-encoder'

            # Load metadata for metrics display
            meta_path = os.path.join(MODEL_DIR, 'bert_model_metadata.json')
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    meta = json.load(f)
                config = meta
                print(f"   ✅ Cross-Encoder loaded (Accuracy: {meta.get('accuracy', 'N/A'):.1%}, "
                      f"F1: {meta.get('f1_score', 'N/A'):.4f})")
            else:
                print("   ✅ Cross-Encoder loaded")
        except Exception as e:
            print(f"   ⚠️ Failed to load Cross-Encoder: {e}")
            cross_encoder_model = None

    # Fallback: try loading bi-encoder model
    if cross_encoder_model is None and os.path.exists(BERT_MODEL_PATH):
        print("📥 Loading bi-encoder BERT matching model...")
        try:
            checkpoint = torch.load(BERT_MODEL_PATH, map_location='cpu', weights_only=False)
            ckpt_config = checkpoint.get('config', {})

            # Check if it's a cross-encoder checkpoint (not a BERTMatchingModel)
            if ckpt_config.get('model_type') == 'cross-encoder-finetuned':
                print("   ℹ️ Checkpoint is cross-encoder format but directory missing.")
                print("   ⚠️ Please unzip rizehire_cross_encoder_final.zip into python-explainability/")
                matching_model = None
            else:
                matching_model_instance = BERTMatchingModel(
                    embedding_dim=ckpt_config.get('embedding_dim', 384),
                    hidden_dim=ckpt_config.get('hidden_dim', 256),
                    dropout=ckpt_config.get('dropout', 0.4)
                )
                matching_model_instance.load_state_dict(checkpoint['model_state_dict'])
                matching_model_instance.eval()
                matching_model = matching_model_instance
                model_type = 'bi-encoder'

                metrics = checkpoint.get('metrics', {})
                config = ckpt_config
                print(f"   ✅ Bi-encoder loaded (Accuracy: {metrics.get('accuracy', 'N/A'):.1%}, "
                      f"F1: {metrics.get('f1_score', 'N/A'):.4f})")
        except Exception as e:
            print(f"   ⚠️ Failed to load bi-encoder: {e}")
            matching_model = None

    # Final fallback
    if cross_encoder_model is None and matching_model is None:
        model_type = 'fallback'
        print("⚠️  No trained model found. Using cosine similarity fallback.")
        print("   Run the Colab notebook or train_bert_model.py to train a model.")

    # Initialize SHAP explainer
    print("🔧 Initializing SHAP explainer...")
    bg_data = generate_background_data()
    shap_explainer = shap.Explainer(predict_from_features, bg_data, feature_names=FEATURE_NAMES)
    print("   ✅ SHAP ready")

    # Initialize LIME explainer
    print("🔧 Initializing LIME explainer...")
    lime_explainer = lime_tabular.LimeTabularExplainer(
        bg_data,
        feature_names=FEATURE_NAMES,
        mode='regression',
        verbose=False
    )
    print("   ✅ LIME ready")


def generate_background_data(n_samples=200):
    """Generate background data for SHAP/LIME baselines.
    Uses stored training embeddings to compute realistic BERT similarity scores,
    combined with realistic score distributions for other features.
    """
    if os.path.exists(BACKGROUND_PATH):
        try:
            with open(BACKGROUND_PATH, 'rb') as f:
                bg = pickle.load(f)

            n = min(n_samples, len(bg.get('labels', [])))
            bg_features = []

            resume_embs = np.array(bg.get('resume_embeddings', []))
            job_embs = np.array(bg.get('job_embeddings', []))

            for i in range(n):
                # Compute real BERT cosine similarity from stored embeddings
                if resume_embs is not None and job_embs is not None:
                    cos_sim = np.dot(resume_embs[i], job_embs[i]) / (
                        np.linalg.norm(resume_embs[i]) * np.linalg.norm(job_embs[i]) + 1e-8
                    )
                    bert_sim = float(np.clip(cos_sim, 0, 1))
                else:
                    bert_sim = np.random.uniform(0.2, 0.9)

                # Realistic score distributions (centered around 0.5 with spread)
                skills = np.clip(np.random.normal(0.55, 0.25), 0, 1)
                exp = np.clip(np.random.normal(0.50, 0.25), 0, 1)
                loc = np.clip(np.random.normal(0.60, 0.30), 0, 1)
                sal = np.clip(np.random.normal(0.55, 0.25), 0, 1)
                bg_features.append([bert_sim, skills, exp, loc, sal])

            print(f"   ✅ Loaded {n} background samples from training data")
            return np.array(bg_features)
        except Exception as e:
            print(f"   ⚠️ Error loading background data: {e}")

    # Fallback: synthetic background with realistic distributions
    print("   ⚠️ Using synthetic background data (no training data found)")
    bg = np.random.uniform(0, 1, size=(n_samples, 5))
    return bg


def generate_text_explanation(features_list, contributions, importance_order):
    """Generate human-readable explanation"""
    explanations = []
    for i in importance_order[:3]:
        name = features_list[i]['name']
        contrib = features_list[i]['contribution']

        if contrib > 5:
            explanations.append(f"✅ {name} strongly increases match (+{contrib:.1f}%)")
        elif contrib > 0:
            explanations.append(f"✅ {name} slightly increases match (+{contrib:.1f}%)")
        elif contrib < -5:
            explanations.append(f"❌ {name} significantly decreases match ({contrib:.1f}%)")
        elif contrib < 0:
            explanations.append(f"⚠️ {name} slightly decreases match ({contrib:.1f}%)")
        else:
            explanations.append(f"➖ {name} has minimal impact (~0%)")

    return " • ".join(explanations)


# ─── API Endpoints ───

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'BERT + SHAP/LIME Explainability Service',
        'model_type': model_type,
        'cross_encoder_loaded': cross_encoder_model is not None,
        'bi_encoder_loaded': matching_model is not None,
        'sbert_loaded': sbert_model is not None,
        'accuracy': config.get('accuracy', 'N/A'),
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Get BERT-based match prediction.

    Input:
    {
        "resume_text": "Full resume text...",
        "job_description": "Full job description...",
        "skills": 65,          // 0-100 from jobMatching.js
        "experience": 50,
        "location": 80,
        "salary": 60
    }
    """
    try:
        data = request.json
        resume_text = data.get('resume_text', '')
        job_text = data.get('job_description', '')

        if not resume_text or not job_text:
            return jsonify({'success': False, 'error': 'resume_text and job_description required'}), 400

        final_score, feature_vector, bert_score = predict_match(
            resume_text, job_text,
            skills_score=data.get('skills', 50),
            experience_score=data.get('experience', 50),
            location_score=data.get('location', 50),
            salary_score=data.get('salary', 50)
        )

        return jsonify({
            'success': True,
            'prediction': float(final_score * 100),
            'bert_semantic_score': float(bert_score * 100),
            'feature_vector': feature_vector.tolist(),
            'breakdown': {
                'bert_similarity': float(bert_score * 100),
                'skills': float(feature_vector[1] * 100),
                'experience': float(feature_vector[2] * 100),
                'location': float(feature_vector[3] * 100),
                'salary': float(feature_vector[4] * 100),
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/explain/shap', methods=['POST'])
def shap_explanation():
    """
    Generate SHAP explanation for a prediction.

    Input (two modes):
    Mode 1 - With text (full BERT):
    {
        "resume_text": "...",
        "job_description": "...",
        "skills": 65, "experience": 50, "location": 80, "salary": 60
    }

    Mode 2 - Without text (backward compatible, uses scores only):
    {
        "skills": 65, "experience": 50, "location": 80, "salary": 60
    }
    """
    try:
        data = request.json
        resume_text = data.get('resume_text', '')
        job_text = data.get('job_description', '')

        skills = data.get('skills', 50)
        experience = data.get('experience', 50)
        location = data.get('location', 50)
        salary = data.get('salary', 50)

        # Build feature vector
        if resume_text and job_text and sbert_model and (matching_model or cross_encoder_model):
            # Full BERT mode (cross-encoder or bi-encoder)
            final_score, feature_vector, bert_score = predict_match(
                resume_text, job_text, skills, experience, location, salary
            )
        else:
            # Backward-compatible mode (no text, just scores)
            bert_sim = 0.5  # Default neutral BERT score
            feature_vector = np.array([
                bert_sim, skills / 100.0, experience / 100.0,
                location / 100.0, salary / 100.0
            ])
            final_score = predict_from_features(feature_vector.reshape(1, -1))[0]
            bert_score = bert_sim

        prediction = final_score

        # Calculate SHAP values
        shap_values = shap_explainer(feature_vector.reshape(1, -1))
        base_value = float(shap_values.base_values[0]) if hasattr(shap_values.base_values, '__iter__') else float(shap_values.base_values)
        feature_shaps = shap_values.values[0].tolist()
        contributions = [val * 100 for val in feature_shaps]

        importance_order = sorted(range(len(contributions)), key=lambda i: abs(contributions[i]), reverse=True)

        features_list = [
            {
                'name': FEATURE_NAMES[i],
                'value': float(feature_vector[i] * 100),
                'shapValue': feature_shaps[i],
                'contribution': contributions[i],
                'importance': abs(contributions[i])
            }
            for i in importance_order
        ]

        return jsonify({
            'success': True,
            'prediction': float(prediction * 100),
            'baseValue': float(base_value * 100),
            'bertSemanticScore': float(bert_score * 100),
            'shapValues': feature_shaps,
            'contributions': contributions,
            'features': features_list,
            'explanation': generate_text_explanation(features_list, contributions, importance_order),
            'modelType': 'BERT + SHAP'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/explain/lime', methods=['POST'])
def lime_explanation():
    """Generate LIME explanation for a prediction. Same input format as SHAP."""
    try:
        data = request.json
        resume_text = data.get('resume_text', '')
        job_text = data.get('job_description', '')

        skills = data.get('skills', 50)
        experience = data.get('experience', 50)
        location = data.get('location', 50)
        salary = data.get('salary', 50)

        if resume_text and job_text and sbert_model and (matching_model or cross_encoder_model):
            # Full BERT mode (cross-encoder or bi-encoder)
            final_score, feature_vector, bert_score = predict_match(
                resume_text, job_text, skills, experience, location, salary
            )
        else:
            bert_sim = 0.5
            feature_vector = np.array([
                bert_sim, skills / 100.0, experience / 100.0,
                location / 100.0, salary / 100.0
            ])
            final_score = predict_from_features(feature_vector.reshape(1, -1))[0]
            bert_score = bert_sim

        prediction = final_score

        # Generate LIME explanation
        exp = lime_explainer.explain_instance(
            feature_vector,
            predict_from_features,
            num_features=5
        )

        lime_values = dict(exp.as_list())
        contributions = []
        for i, fname in enumerate(FEATURE_NAMES):
            contrib = 0
            for key, value in lime_values.items():
                if fname.lower().split()[0] in key.lower():
                    contrib = value * 100
                    break
            contributions.append(contrib)

        importance_order = sorted(range(len(contributions)), key=lambda i: abs(contributions[i]), reverse=True)

        features_list = [
            {
                'name': FEATURE_NAMES[i],
                'value': float(feature_vector[i] * 100),
                'contribution': contributions[i],
                'importance': abs(contributions[i])
            }
            for i in importance_order
        ]

        return jsonify({
            'success': True,
            'prediction': float(prediction * 100),
            'bertSemanticScore': float(bert_score * 100),
            'contributions': contributions,
            'features': features_list,
            'explanation': generate_text_explanation(features_list, contributions, importance_order),
            'intercept': float(exp.intercept[0] * 100),
            'modelType': 'BERT + LIME'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/explain/combined', methods=['POST'])
def combined_explanation():
    """Get both SHAP and LIME explanations in one call."""
    try:
        shap_result = shap_explanation()
        shap_data = json.loads(shap_result.get_data())

        lime_result = lime_explanation()
        lime_data = json.loads(lime_result.get_data())

        # Calculate agreement
        shap_c = shap_data.get('contributions', [])
        lime_c = lime_data.get('contributions', [])
        agreement = 0.0
        if shap_c and lime_c:
            agreement = float(np.corrcoef(np.array(shap_c), np.array(lime_c))[0, 1])

        return jsonify({
            'success': True,
            'shap': shap_data,
            'lime': lime_data,
            'comparison': {
                'agreement': agreement,
                'message': 'SHAP provides global Shapley-value based feature attribution. '
                           'LIME provides local linear approximation around this prediction.'
            },
            'modelType': 'BERT + SHAP + LIME'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/retrain', methods=['POST'])
def retrain_model():
    """Trigger model retraining (requires dataset path in request)"""
    try:
        data = request.json or {}
        dataset_path = data.get('dataset_path')

        if not dataset_path or not os.path.exists(dataset_path):
            return jsonify({
                'success': False,
                'error': 'Provide a valid dataset_path. Run train_bert_model.py manually for full training.'
            }), 400

        return jsonify({
            'success': True,
            'message': 'For BERT retraining, run: python train_bert_model.py --dataset <path>',
            'note': 'BERT training requires GPU for reasonable speed. Use Google Colab if needed.'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/model-info', methods=['GET'])
def model_info():
    """Return model architecture and training info"""
    meta_path = os.path.join(MODEL_DIR, 'bert_model_metadata.json')
    metadata = {}
    if os.path.exists(meta_path):
        with open(meta_path, 'r') as f:
            metadata = json.load(f)

    return jsonify({
        'success': True,
        'model_type': 'Sentence-BERT + Dual-Stream Neural Network',
        'sbert_model': 'all-MiniLM-L6-v2 (384-dim embeddings)',
        'architecture': '768 → 128 → 64 → 1 (with BatchNorm + Dropout)',
        'explainability': 'SHAP (Shapley values) + LIME (local linear approximation)',
        'features': FEATURE_NAMES,
        'weights': {
            'BERT Semantic Similarity': '40%',
            'Skills Match': '30%',
            'Experience Match': '15%',
            'Location Match': '10%',
            'Salary Match': '5%'
        },
        'training_metadata': metadata
    })


if __name__ == '__main__':
    print("🚀 Starting BERT + SHAP/LIME Explainability Service...")
    print("=" * 60)

    load_models()

    print("=" * 60)
    print("✅ Service ready!")

    port = int(os.environ.get('PORT', 5001))
    print(f"📡 Listening on http://localhost:{port}")
    print("=" * 60)

    app.run(host='0.0.0.0', port=port, debug=True)
