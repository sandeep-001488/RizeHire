#!/bin/bash

echo "🐍 Setting up Python SHAP/LIME Explainability Service..."
echo "=================================================="

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed!"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d " " -f 2)
echo "✅ Python version: $PYTHON_VERSION"

# Create virtual environment
echo ""
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo ""
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "=================================================="
echo "✅ Setup complete!"
echo ""
echo "To start the service:"
echo "  1. Activate virtual environment: source venv/bin/activate"
echo "  2. Run the service: python app.py"
echo ""
echo "The service will run on http://localhost:5001"
echo "=================================================="
