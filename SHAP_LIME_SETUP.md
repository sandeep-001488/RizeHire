# 🧠 SHAP & LIME Integration Setup Guide

This guide will help you set up the Python SHAP/LIME explainability microservice.

## 📋 What We Built

```
Architecture:
Node.js Backend (Port 5000)
    ↓ HTTP Request
Python Flask API (Port 5001) ← SHAP & LIME
    ↓ HTTP Response
Node.js Backend
    ↓
Frontend (displays explanations)
```

## 🚀 Quick Start (5 minutes)

### Step 1: Navigate to Python Service

```bash
cd python-explainability
```

### Step 2: Setup Python Environment

**Option A: Automatic Setup (Recommended)**
```bash
chmod +x setup.sh
./setup.sh
```

**Option B: Manual Setup**
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Mac/Linux
# OR
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Start Python Service

```bash
# Make sure venv is activated (you should see (venv) in terminal)
python app.py
```

You should see:
```
🚀 Starting SHAP/LIME Explainability Service...
🧠 Training new model...
📊 Generating training data...
🔄 Training neural network...
Epoch 1000/10000...
✅ Training complete!
🔧 Initializing SHAP explainer...
🔧 Initializing LIME explainer...
✅ Service ready!
📡 Listening on http://localhost:5001
```

### Step 4: Test Python Service (New Terminal)

```bash
# Health check
curl http://localhost:5001/health

# Should return: {"status": "healthy", "service": "SHAP/LIME Explainability Service"}
```

### Step 5: Your Node.js Backend is Already Updated!

Since you're using nodemon, the backend has already reloaded with the new explainability endpoints.

## 🧪 Test the Integration

### 1. Test from Node.js Backend

```bash
# In your Node.js terminal, the backend should show:
# "✅ Connected to Python explainability service"
```

### 2. Test from Frontend

**Login as a seeker** and navigate to a job page, then open browser console:

```javascript
// Test SHAP explanation
const jobId = "YOUR_JOB_ID";  // Get from URL

fetch(`http://localhost:5000/api/ai/explainability/shap/${jobId}`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
.then(res => res.json())
.then(data => console.log('SHAP:', data));
```

## 📊 What Each Endpoint Does

### `/explain/shap` - SHAP Explanation
**What it shows:** Global feature importance (which factors matter most overall)

Example response:
```json
{
  "prediction": 52.3,
  "features": [
    {
      "name": "Skills Match",
      "contribution": +8.0,
      "importance": 8.0
    },
    {
      "name": "Experience Match",
      "contribution": -5.0,
      "importance": 5.0
    }
  ],
  "explanation": "✅ Skills Match strongly increases acceptance (+8.0%) • ❌ Experience Match decreases acceptance (-5.0%)"
}
```

### `/explain/lime` - LIME Explanation
**What it shows:** Local linear approximation (why THIS specific prediction)

### `/explain/combined` - Both SHAP + LIME
**What it shows:** Comprehensive explanation with agreement score

## 🎯 API Endpoints Summary

### From Node.js (accessible to frontend):

```
GET  /api/ai/explainability/health          - Check Python service
GET  /api/ai/explainability/shap/:jobId     - Get SHAP explanation
GET  /api/ai/explainability/lime/:jobId     - Get LIME explanation
GET  /api/ai/explainability/combined/:jobId - Get both SHAP + LIME
```

### Direct Python API (for testing):

```
GET  http://localhost:5001/health           - Health check
POST http://localhost:5001/explain/shap     - SHAP explanation
POST http://localhost:5001/explain/lime     - LIME explanation
POST http://localhost:5001/explain/combined - Combined
POST http://localhost:5001/retrain          - Retrain model
```

## 🐛 Troubleshooting

### Python not found
```bash
# Install Python 3.8+
brew install python3  # Mac
# Or download from python.org
```

### Port 5001 already in use
```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9
```

### Module not found errors
```bash
# Make sure venv is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### SHAP/LIME installation fails
```bash
# Try installing one by one
pip install numpy
pip install scikit-learn
pip install shap
pip install lime
```

### Python service won't connect to Node.js
- Check Python service is running on port 5001
- Check no firewall blocking localhost
- Verify .env has: `PYTHON_EXPLAINABILITY_URL=http://localhost:5001`

## 🚢 Running Both Services

### Terminal 1: Python Service
```bash
cd python-explainability
source venv/bin/activate
python app.py
```

### Terminal 2: Node.js Backend (Already Running)
```bash
# Your nodemon should already be running
# Backend auto-reloaded with new endpoints
```

### Terminal 3: Frontend (if not running)
```bash
cd client
npm run dev
```

## 📝 What to Show Your Professor

1. **Live Demo:**
   - Show job match with ML prediction
   - Click "Match Details"
   - Show SHAP feature importance bars
   - Explain which factors matter most

2. **Python Code:**
   - Show `python-explainability/app.py`
   - Point out SHAP and LIME imports
   - Explain neural network training

3. **Architecture Diagram:**
   - Draw: Node.js → Python → SHAP/LIME → Response
   - Mention microservice architecture
   - Highlight explainable AI concepts

4. **API Calls:**
   - Show Postman/curl requests
   - Demonstrate SHAP vs LIME differences

## 🎓 For Your Presentation

**Say:**
> "We implemented explainable AI using SHAP and LIME libraries in a Python microservice. SHAP provides global feature importance using Shapley values from game theory, while LIME creates local linear approximations. Our Node.js backend communicates with the Python service via REST API, enabling seamless integration of state-of-the-art explainability into our application."

**Professor will be impressed by:**
- ✅ Microservice architecture
- ✅ Real SHAP & LIME libraries (not just mock)
- ✅ Clean API design
- ✅ Full-stack integration
- ✅ Understanding of explainable AI concepts

## 📚 Next Steps

1. ✅ **Test both services are running**
2. ✅ **Add frontend UI to display SHAP charts** (coming next!)
3. ✅ **Create demo screenshots**
4. ✅ **Prepare presentation slides**
5. ✅ **Commit everything to git**

## 🎉 Success Checklist

- [ ] Python service starts without errors
- [ ] Health check returns "healthy"
- [ ] SHAP explanation returns feature importance
- [ ] LIME explanation works
- [ ] Node.js backend connects to Python service
- [ ] Frontend can call explainability endpoints
- [ ] Ready to impress professor! 🚀

## 💡 Pro Tips

- Keep Python service running during demo
- If it crashes, Node.js will use fallback explanations
- Test with different job matches to show variety
- Screenshot SHAP charts for presentation
- Commit this to a separate branch for clean git history

---

**Questions?** Check the troubleshooting section above or ask me! 🤖
