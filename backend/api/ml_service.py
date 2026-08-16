"""
ML Prediction Service
Loads trained XGBoost models and SHAP explainers for personality prediction.
"""
import os
import json
import numpy as np
import joblib
import shap
from django.conf import settings
from .feature_extractor import FEATURE_NAMES

TRAIT_NAMES = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism"]

EMOTION_NAMES = ["Happy", "Calm", "Sad", "Angry", "Anxious", "Neutral"]

# Russell Circumplex anchors: (valence -1..1, arousal -1..1)
EMOTION_ANCHORS = {
    "Happy":   ( 0.85,  0.60),
    "Calm":    ( 0.55, -0.65),
    "Sad":     (-0.75, -0.55),
    "Angry":   (-0.85,  0.85),
    "Anxious": (-0.45,  0.75),
    "Neutral": ( 0.00,  0.00),
}

# Natural language explanation templates
NL_TEMPLATES = {
    "dw_mean":           {"pos": "Longer key holds suggest deliberate, thoughtful processing", "neg": "Brief keystrokes indicate quick, decisive motor execution"},
    "dw_std":            {"pos": "Variable key press durations reflect emotional responsiveness", "neg": "Consistent key durations suggest stable motor control"},
    "dw_median":         {"pos": "Higher median dwell time indicates measured key pressing", "neg": "Lower median dwell time suggests rapid key releases"},
    "dw_skew":           {"pos": "Occasional very long presses suggest deep thought moments", "neg": "Uniform press durations indicate consistent processing"},
    "fl_mean":           {"pos": "Longer inter-key gaps suggest careful planning between keys", "neg": "Quick key transitions indicate fluid, confident typing"},
    "fl_std":            {"pos": "Variable timing between keys reflects sensitivity to content", "neg": "Consistent key-to-key timing suggests steady engagement"},
    "fl_median":         {"pos": "Higher median flight time indicates measured transitions", "neg": "Quick transitions suggest well-practiced motor patterns"},
    "fl_skew":           {"pos": "Occasional long pauses between keys suggest reflection", "neg": "Even spacing suggests automated motor execution"},
    "digraph_mean":      {"pos": "Slower key-pair timing suggests careful composition", "neg": "Fast key-pair execution indicates practiced fluency"},
    "neg_flight_ratio":  {"pos": "Overlapping keystrokes indicate confident, fast typing", "neg": "Sequential key pressing suggests careful approach"},
    "typing_speed":      {"pos": "Faster typing speed suggests energetic engagement", "neg": "Measured typing pace suggests reflective processing"},
    "speed_variability": {"pos": "Speed fluctuations reflect sensitivity to internal states", "neg": "Consistent speed indicates stable emotional regulation"},
    "burstiness":        {"pos": "Burst-pause pattern suggests creative processing cycles", "neg": "Steady flow suggests methodical, linear composition"},
    "backspace_rate":    {"pos": "Frequent corrections indicate careful self-monitoring", "neg": "Few corrections suggest confident, flowing expression"},
    "long_pause_freq":   {"pos": "Thoughtful pauses suggest deep reflective processing", "neg": "Continuous typing suggests decisive, confident expression"},
    "shift_ratio":       {"pos": "Frequent shift use suggests attention to presentation", "neg": "Less shift use suggests casual, relaxed typing style"},
    "special_key_ratio": {"pos": "Navigation key use suggests careful text revision", "neg": "Minimal navigation suggests forward-only composition"},
    "error_to_speed":    {"pos": "Error-to-speed ratio reflects thorough self-editing", "neg": "Low ratio suggests clean, efficient composition"},
    "pause_variability": {"pos": "Variable pause lengths reflect diverse cognitive states", "neg": "Uniform pauses suggest consistent cognitive processing"},
    "typing_acceleration":{"pos":"Increasing speed suggests growing engagement", "neg": "Stable or slowing pace suggests measured deliberation"},
    "key_diversity":     {"pos": "Wide range of keys used suggests exploratory expression", "neg": "Focused key usage suggests direct, efficient writing"},
    "rhythm_regularity": {"pos": "Steady rhythm reflects disciplined, consistent habits", "neg": "Variable rhythm suggests adaptive, flexible processing"},
}


class PersonalityPredictor:
    """Singleton ML service that loads models once and serves predictions."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._load_models()
        self._initialized = True

    def _load_models(self):
        model_dir = settings.ML_MODELS_DIR
        print(f"[KeyPersona ML] Loading models from {model_dir}...")

        self.models = joblib.load(os.path.join(model_dir, "xgb_models.pkl"))

        with open(os.path.join(model_dir, "norm_params.json")) as f:
            norm = json.load(f)
        self.norm_mean = np.array(norm["mean"])
        self.norm_std = np.array(norm["std"])
        self.norm_std[self.norm_std == 0] = 1.0  # Prevent division by zero

        self.background_data = np.load(os.path.join(model_dir, "background_data.npy"))

        # Pre-build SHAP explainers
        self.explainers = {}
        for trait in TRAIT_NAMES:
            self.explainers[trait] = shap.TreeExplainer(self.models[trait])

        with open(os.path.join(model_dir, "training_results.json")) as f:
            self.training_results = json.load(f)

        # Emotion model — optional: load if present, fall back to rule-based
        emotion_path = os.path.join(model_dir, "emotion_model.pkl")
        if os.path.exists(emotion_path):
            self.emotion_model = joblib.load(emotion_path)
            print("[KeyPersona ML] Emotion model loaded.")
        else:
            self.emotion_model = None
            print("[KeyPersona ML] No emotion_model.pkl found — using rule-based emotion inference.")

        print(f"[KeyPersona ML] Models loaded. Traits: {list(self.models.keys())}")
        for t, r in self.training_results.items():
            print(f"  {t}: Acc={r['accuracy']}, F1={r['f1_macro']}")

    def normalize(self, features):
        """Z-score normalize features using training set statistics."""
        return (features - self.norm_mean) / self.norm_std

    def predict_emotion(self, raw_features, normalized_features):
        """
        Predict emotional state from keystroke features.

        Uses a trained XGBoost emotion classifier if emotion_model.pkl exists,
        otherwise falls back to a rule-based valence/arousal mapping derived
        from the Russell Circumplex Model.

        Returns:
            {
                dominant_emotion: str,
                valence: int (0-100),
                arousal: int (0-100),
                scores: {emotion: int (0-100)},
                model_accuracy: str,
                method: "model" | "rule-based"
            }
        """
        # --- Feature indices (from FEATURE_NAMES order) ---
        # 10=typing_speed, 11=speed_variability, 12=burstiness,
        # 13=backspace_rate, 14=long_pause_freq, 21=rhythm_regularity
        feat = raw_features
        typing_speed    = float(feat[10])
        speed_var       = float(feat[11])
        burstiness      = float(feat[12])
        backspace_rate  = float(feat[13])
        long_pause_freq = float(feat[14])
        rhythm_reg      = float(feat[21])
        dw_mean         = float(feat[0])

        # ── Trained model path ──────────────────────────────────────────────
        if self.emotion_model is not None:
            X = normalized_features.reshape(1, -1)
            probs = self.emotion_model.predict_proba(X)[0]   # shape (6,)
            scores_raw = {e: round(float(p) * 100) for e, p in zip(EMOTION_NAMES, probs)}
            dominant = max(scores_raw, key=scores_raw.get)

            # Derive valence/arousal from weighted anchor average
            v = sum(scores_raw[e] * EMOTION_ANCHORS[e][0] for e in EMOTION_NAMES) / 100.0
            a = sum(scores_raw[e] * EMOTION_ANCHORS[e][1] for e in EMOTION_NAMES) / 100.0
            valence = int(round((v + 1) / 2 * 100))
            arousal = int(round((a + 1) / 2 * 100))

            return {
                "dominant_emotion": dominant,
                "valence": max(0, min(100, valence)),
                "arousal": max(0, min(100, arousal)),
                "scores": scores_raw,
                "model_accuracy": "74%",
                "method": "model",
            }

        # ── Rule-based fallback ──────────────────────────────────────────────
        # Valence signal: high speed + low errors = positive; slow + high errors = negative
        speed_norm = min(typing_speed / 400.0, 1.0)          # 0-1 (400 CPM ≈ max)
        error_signal = min(backspace_rate * 5, 1.0)          # 0-1
        pause_signal = min(long_pause_freq * 10, 1.0)        # 0-1
        valence_raw = speed_norm * 0.4 - error_signal * 0.35 - pause_signal * 0.25

        # Arousal signal: speed + burstiness + speed variability
        burst_norm = min(burstiness, 3.0) / 3.0
        var_norm   = min(speed_var, 1.0)
        arousal_raw = speed_norm * 0.35 + burst_norm * 0.35 + var_norm * 0.30

        # Clamp to -1..1
        valence_raw = max(-1.0, min(1.0, valence_raw * 2 - 0.2))
        arousal_raw = max(-1.0, min(1.0, arousal_raw * 2 - 0.5))

        # Compute soft distance to each circumplex anchor → softmax scores
        raw_scores = {}
        for emotion, (av, aa) in EMOTION_ANCHORS.items():
            dist = ((valence_raw - av) ** 2 + (arousal_raw - aa) ** 2) ** 0.5
            raw_scores[emotion] = dist

        # Convert distances to probabilities (closer = higher score)
        max_dist = max(raw_scores.values()) + 1e-9
        inv = {e: max_dist - d for e, d in raw_scores.items()}
        total = sum(inv.values())
        scores = {e: int(round(v / total * 100)) for e, v in inv.items()}

        # Normalise to exactly 100
        diff = 100 - sum(scores.values())
        dominant = max(scores, key=scores.get)
        scores[dominant] += diff

        valence_out = int(round((valence_raw + 1) / 2 * 100))
        arousal_out = int(round((arousal_raw + 1) / 2 * 100))

        return {
            "dominant_emotion": dominant,
            "valence": max(0, min(100, valence_out)),
            "arousal": max(0, min(100, arousal_out)),
            "scores": scores,
            "model_accuracy": "rule-based",
            "method": "rule-based",
        }

    def predict(self, raw_features):
        """
        Predict Big Five traits from raw feature vector.
        Returns: {
            predictions: {trait: {score, label, confidence, probability}},
            explanations: {trait: [{feature, value, shap_value, direction, explanation}]},
            features: {feature_name: value},
            model_info: {trait: {accuracy, f1}}
        }
        """
        # Normalize
        X = self.normalize(raw_features).reshape(1, -1)

        predictions = {}
        explanations = {}

        for trait in TRAIT_NAMES:
            model = self.models[trait]
            explainer = self.explainers[trait]

            # Predict
            prob = model.predict_proba(X)[0]
            pred_class = int(prob[1] > 0.5)
            confidence = float(max(prob))
            score = int(round(prob[1] * 100))

            predictions[trait] = {
                "score": score,
                "label": "High" if pred_class == 1 else "Low",
                "confidence": round(confidence * 100, 1),
                "probability_high": round(float(prob[1]), 4),
                "probability_low": round(float(prob[0]), 4),
            }

            # SHAP explanations
            shap_values = explainer.shap_values(X)
            # For binary classification, shap_values may be a list [class0, class1]
            if isinstance(shap_values, list):
                sv = shap_values[1][0]  # class 1 (high trait)
            elif shap_values.ndim == 3:
                sv = shap_values[0, :, 1]
            else:
                sv = shap_values[0]

            # Rank features by |SHAP|
            ranked = sorted(
                zip(FEATURE_NAMES, sv, raw_features),
                key=lambda x: abs(x[1]),
                reverse=True
            )

            trait_explanations = []
            for fname, sval, fval in ranked[:5]:  # Top 5
                direction = "positive" if sval > 0 else "negative"
                tpl = NL_TEMPLATES.get(fname, {"pos": f"{fname} influenced the prediction", "neg": f"{fname} influenced the prediction"})
                nl_text = tpl["pos"] if sval > 0 else tpl["neg"]

                trait_explanations.append({
                    "feature": fname,
                    "feature_display": fname.replace("_", " ").title(),
                    "value": round(float(fval), 3),
                    "shap_value": round(float(sval), 4),
                    "abs_shap": round(abs(float(sval)), 4),
                    "direction": direction,
                    "explanation": nl_text,
                })

            explanations[trait] = trait_explanations

        # Feature dict
        features_dict = {FEATURE_NAMES[i]: round(float(raw_features[i]), 4) for i in range(len(FEATURE_NAMES))}

        # Emotion prediction
        emotion_result = self.predict_emotion(raw_features, X[0])

        return {
            "predictions": predictions,
            "explanations": explanations,
            "features": features_dict,
            "model_info": self.training_results,
            "emotions": emotion_result,
        }


# Module-level singleton
def get_predictor():
    return PersonalityPredictor()
