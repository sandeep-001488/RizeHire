# SHAP/LIME Explainability Microservice

Python Flask API that provides explainable AI for job application predictions using SHAP and LIME.

## 🎯 Purpose

This microservice explains **WHY** the ML model makes its predictions by:
- **SHAP (SHapley Additive exPlanations):** Shows global feature importance
- **LIME (Local Interpretable Model-agnostic Explanations):** Provides local explanations

## 🏗️ Architecture

```
Node.js Backend (Port 5000)
    ↓ HTTP Request
Python Flask API (Port 5001) ← SHAP/LIME
    ↓ HTTP Response (JSON)
Node.js Backend
    ↓
Frontend (displays explanations)
```

## 📦 Setup

### 1. Create Virtual Environment (Recommended)

```bash
cd python-explainability
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Service

```bash
python app.py
```

Service will start on **http://localhost:5001**

## 🔌 API Endpoints

### Health Check
```bash
GET /health
```

### SHAP Explanation
```bash
POST /explain/shap
Content-Type: application/json

{
  "skills": 65,
  "experience": 50,
  "location": 80,
  "salary": 60
}
```

**Response:**
```json
{
  "success": true,
  "prediction": 52.3,
  "baseValue": 48.5,
  "shapValues": [0.08, -0.05, 0.02, 0.01],
  "contributions": [8.0, -5.0, 2.0, 1.0],
  "features": [
    {
      "name": "Skills Match",
      "value": 65,
      "contribution": 8.0,
      "importance": 8.0
    },
    ...
  ],
  "explanation": "✅ Skills Match strongly increases acceptance (+8.0%)"
}
```

### LIME Explanation
```bash
POST /explain/lime
```
Same input/output format as SHAP

### Combined Explanation (SHAP + LIME)
```bash
POST /explain/combined
```
Returns both SHAP and LIME explanations + agreement score

### Retrain Model
```bash
POST /retrain
```

## 🧠 How It Works

1. **Training:** Generates 1000 synthetic examples matching JavaScript model logic
2. **Model:** Scikit-learn MLPRegressor (4-8-1 neural network)
3. **SHAP:** Calculates Shapley values for feature importance
4. **LIME:** Creates local linear approximation around prediction

## 🔧 Model Architecture

```
Input Layer (4 features)
    ↓
Hidden Layer (8 neurons, sigmoid)
    ↓
Output Layer (1 neuron, acceptance probability)
```

Matches the JavaScript neural network architecture!

## 📊 Example Explanation

**Input:**
- Skills: 65%, Experience: 50%, Location: 80%, Salary: 60%

**SHAP Output:**
- Base prediction: 48.5%
- Skills contribution: +8.0% → Final: 56.5%
- Most important: Skills Match (most impact on prediction)

**LIME Output:**
- Local model: Linear approximation around this point
- Confirms: Skills is most important locally

## 🐛 Troubleshooting

**Port already in use:**
```bash
lsof -ti:5001 | xargs kill -9
```

**Module not found:**
```bash
pip install -r requirements.txt
```

**SHAP/LIME errors:**
- Ensure numpy version is compatible
- Try: `pip install --upgrade shap lime`

## 🚀 Production Deployment

### Docker (Recommended)

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5001
CMD ["python", "app.py"]
```

### Railway/Heroku

```bash
# Add Procfile
web: python app.py
```

## 📚 Learn More

- [SHAP Documentation](https://shap.readthedocs.io/)
- [LIME Documentation](https://lime-ml.readthedocs.io/)
- [Explainable AI Guide](https://christophm.github.io/interpretable-ml-book/)
