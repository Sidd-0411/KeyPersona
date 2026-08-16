# KeyPersona - AI-Powered Personality Prediction via Keystroke Dynamics

## 🧠 Overview

KeyPersona is a full-stack application that predicts Big Five personality traits (OCEAN) from keystroke dynamics using trained XGBoost machine learning models with SHAP explainability.

**Tech Stack:**
- **Backend:** Django 4.2 + Django REST Framework
- **ML Models:** XGBoost (5 classifiers, one per trait)
- **Explainability:** SHAP TreeExplainer (game-theory feature attribution)
- **Feature Extraction:** 22 keystroke features (NumPy/SciPy)
- **Frontend:** React.js (connects to Django API)
- **Database:** SQLite (dev) / PostgreSQL (prod)

## 📊 Model Performance (5-Fold Cross-Validation)

| Trait              | Accuracy | Macro F1 |
|--------------------|----------|----------|
| Openness           | 78.7%    | 0.787    |
| Conscientiousness  | 81.0%    | 0.810    |
| Extraversion       | 86.4%    | 0.749    |
| Agreeableness      | 78.3%    | 0.782    |
| Neuroticism        | 80.6%    | 0.749    |

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd keypersona
pip install -r requirements.txt
```

### 2. Run Database Migrations
```bash
cd backend
python manage.py migrate
```

### 3. Start Django Server
```bash
python manage.py runserver 8000
```

### 4. Test the API

# Health check
curl http://localhost:8000/api/health/


### 5. Open Frontend
1. On the new PC, inside the project folder:
cd keypersona/frontend
2. Create a Vite React app scaffold (just for the config files):
npm create vite@latest . -- --template react

Choose "Ignore files and continue" when it warns about existing files.

3. Install dependencies:
npm install
4. Run it:
npm run dev

## 📁 Project Structure

```
keypersona/
├── backend/                    # Django project
│   ├── config/
│   │   ├── settings.py         # Django configuration
│   │   └── urls.py             # Root URL routing
│   ├── api/
│   │   ├── models.py           # Session, KeystrokeEvent, PredictionResult
│   │   ├── views.py            # 5 REST API endpoints
│   │   ├── serializers.py      # Request/response serialization
│   │   ├── urls.py             # API URL routing
│   │   ├── feature_extractor.py # 22-feature keystroke analysis
│   │   └── ml_service.py       # XGBoost + SHAP prediction service
│   ├── manage.py
│   └── db.sqlite3              # SQLite database
├── ml_models/                  # Trained ML artifacts
│   ├── xgb_models.pkl          # 5 XGBoost classifiers (joblib)
│   ├── norm_params.json        # Feature normalization parameters
│   ├── background_data.npy     # SHAP background samples (200)
│   ├── feature_names.json      # 22 feature names
│   ├── shap_global_importance.json  # Global SHAP rankings
│   └── training_results.json   # CV accuracy/F1 metrics
├── scripts/
│   └── train_models.py         # Full training pipeline
├── frontend/
│   └── KeyPersona_FullStack_App.jsx  # React frontend
├── requirements.txt
└── README.md
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health/` | GET | Service health + model status |
| `/api/session/` | POST | Create new typing session |
| `/api/keystrokes/` | POST | Submit keystroke events |
| `/api/predict/` | POST | Run ML prediction + SHAP |
| `/api/result/<session_id>/` | GET | Retrieve saved results |

### POST /api/keystrokes/
```json
{
  "session_id": "uuid-here",
  "task_id": "copy_1",
  "events": [
    {"event_type": "keydown", "key": "T", "code": "KeyT", "timestamp": 1234.56, "is_repeat": false},
    {"event_type": "keyup", "key": "T", "code": "KeyT", "timestamp": 1334.56, "is_repeat": false}
  ]
}
```

### POST /api/predict/
```json
{"session_id": "uuid-here"}
```

**Response:**
```json
{
  "predictions": {
    "Extraversion": {"score": 72, "label": "High", "confidence": 82.3}
  },
  "explanations": {
    "Extraversion": [
      {"feature": "typing_speed", "value": 285.4, "shap_value": 0.342, "direction": "positive",
       "explanation": "Faster typing speed suggests energetic engagement"}
    ]
  },
  "features": {"dw_mean": 95.2, "typing_speed": 285.4, ...},
  "model_info": {"Extraversion": {"accuracy": 0.864, "f1_macro": 0.749}}
}
```

## 🔬 22 Keystroke Features Extracted

**Low-Level Timing (10):**
dw_mean, dw_std, dw_median, dw_skew, fl_mean, fl_std, fl_median, fl_skew, digraph_mean, neg_flight_ratio

**Higher-Order Behavioural (12):**
typing_speed, speed_variability, burstiness, backspace_rate, long_pause_freq, shift_ratio, special_key_ratio, error_to_speed, pause_variability, typing_acceleration, key_diversity, rhythm_regularity

## 🧪 Re-Training Models

To retrain with different parameters or data:
```bash
python scripts/train_models.py
```
This generates 2,400 samples (800 participants × 3 sessions) with empirically-grounded trait-feature correlations from published research.

## 📚 Research Basis

- Buker & Vinciarelli (2021) - Big Five from keystroke dynamics, F1 ~0.72
- Khan et al. (2015) - Personality from keyboard + mouse
- Epp et al. (2011) - Emotional states from keystroke timing
- Lundberg & Lee (2017) - SHAP framework for model explainability
