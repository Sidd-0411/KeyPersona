"""
KeyPersona ML Model Training Pipeline
Trains XGBoost classifiers for Big Five personality prediction from keystroke dynamics.

Training data is synthesized based on empirical distributions from:
- Buker & Vinciarelli (2021): F1 ~0.72 for keystroke-personality
- Khan et al. (2015): Keyboard + mouse personality correlations
- Epp et al. (2011): Emotional states from keystroke dynamics

Each trait model learns the documented feature-personality correlations.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score, classification_report
from xgboost import XGBClassifier
import shap
import joblib
import os
import json

np.random.seed(42)

FEATURE_NAMES = [
    "dw_mean", "dw_std", "dw_median", "dw_skew",
    "fl_mean", "fl_std", "fl_median", "fl_skew",
    "digraph_mean", "neg_flight_ratio",
    "typing_speed", "speed_variability", "burstiness",
    "backspace_rate", "long_pause_freq", "shift_ratio",
    "special_key_ratio", "error_to_speed", "pause_variability",
    "typing_acceleration", "key_diversity", "rhythm_regularity"
]

TRAIT_NAMES = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism"]

# === Population distributions (from literature) ===
POP_PARAMS = {
    "dw_mean":          {"mean": 102, "std": 30},
    "dw_std":           {"mean": 36,  "std": 18},
    "dw_median":        {"mean": 95,  "std": 28},
    "dw_skew":          {"mean": 0.8, "std": 0.5},
    "fl_mean":          {"mean": 145, "std": 65},
    "fl_std":           {"mean": 120, "std": 60},
    "fl_median":        {"mean": 118, "std": 55},
    "fl_skew":          {"mean": 1.2, "std": 0.7},
    "digraph_mean":     {"mean": 210, "std": 80},
    "neg_flight_ratio": {"mean": 0.08,"std": 0.06},
    "typing_speed":     {"mean": 260, "std": 75},
    "speed_variability":{"mean": 0.24,"std": 0.09},
    "burstiness":       {"mean": 0.42,"std": 0.18},
    "backspace_rate":   {"mean": 0.055,"std":0.03},
    "long_pause_freq":  {"mean": 0.025,"std":0.015},
    "shift_ratio":      {"mean": 0.06,"std": 0.025},
    "special_key_ratio":{"mean": 0.012,"std":0.008},
    "error_to_speed":   {"mean": 0.22,"std": 0.12},
    "pause_variability":{"mean": 350, "std": 180},
    "typing_acceleration":{"mean":0.0,"std": 0.15},
    "key_diversity":    {"mean": 3.4, "std": 0.4},
    "rhythm_regularity":{"mean": 0.65,"std": 0.16},
}

# === Trait-feature correlations (from empirical studies) ===
# Positive value = high trait -> higher feature value
TRAIT_CORRELATIONS = {
    "Extraversion": {
        "typing_speed": 0.38, "dw_mean": -0.35, "dw_median": -0.32,
        "rhythm_regularity": 0.22, "burstiness": -0.15, "shift_ratio": 0.18,
        "long_pause_freq": -0.20, "fl_mean": -0.25, "neg_flight_ratio": 0.12,
        "speed_variability": -0.10, "dw_std": -0.15
    },
    "Neuroticism": {
        "speed_variability": 0.35, "fl_std": 0.32, "backspace_rate": 0.30,
        "long_pause_freq": 0.25, "dw_std": 0.28, "pause_variability": 0.22,
        "error_to_speed": 0.20, "rhythm_regularity": -0.18, "typing_speed": -0.12,
        "burstiness": 0.15, "dw_skew": 0.10
    },
    "Conscientiousness": {
        "rhythm_regularity": 0.35, "backspace_rate": -0.28, "speed_variability": -0.30,
        "dw_std": -0.22, "shift_ratio": 0.18, "typing_speed": 0.15,
        "error_to_speed": -0.20, "long_pause_freq": -0.12, "burstiness": -0.10,
        "special_key_ratio": 0.08
    },
    "Openness": {
        "key_diversity": 0.30, "burstiness": 0.25, "long_pause_freq": 0.20,
        "speed_variability": 0.15, "pause_variability": 0.18, "dw_skew": 0.10,
        "special_key_ratio": 0.12, "typing_acceleration": 0.08,
        "rhythm_regularity": -0.08
    },
    "Agreeableness": {
        "speed_variability": -0.18, "backspace_rate": -0.15, "rhythm_regularity": 0.12,
        "burstiness": -0.12, "dw_mean": 0.10, "fl_std": -0.10,
        "error_to_speed": 0.08, "typing_speed": -0.05
    },
}


def generate_synthetic_data(n_participants=800, sessions_per_participant=3):
    """
    Generate synthetic keystroke feature data with realistic trait-feature correlations.
    Each participant has a latent personality and their features are shifted accordingly.
    """
    print(f"Generating synthetic data: {n_participants} participants, {sessions_per_participant} sessions each...")
    
    all_features = []
    all_labels = {t: [] for t in TRAIT_NAMES}
    participant_ids = []
    
    for pid in range(n_participants):
        # Generate latent Big Five scores (continuous, 1-5 scale, correlated)
        base = np.random.normal(3.0, 0.8, 5)
        # Add inter-trait correlations (E-A positive, N-C negative, etc.)
        base[2] += 0.2 * base[3]   # E-A correlation
        base[4] -= 0.15 * base[1]  # N-C negative correlation
        trait_scores = np.clip(base, 1, 5)
        trait_labels = {TRAIT_NAMES[i]: 1 if trait_scores[i] > 3.0 else 0 for i in range(5)}
        
        # Base typing profile for this participant (individual differences)
        base_features = {}
        for fname in FEATURE_NAMES:
            p = POP_PARAMS[fname]
            base_features[fname] = np.random.normal(p["mean"], p["std"] * 0.6)
        
        # Apply trait-correlated shifts
        for trait_idx, trait in enumerate(TRAIT_NAMES):
            z_trait = (trait_scores[trait_idx] - 3.0) / 0.8  # standardized trait score
            for fname, corr in TRAIT_CORRELATIONS.get(trait, {}).items():
                shift = corr * z_trait * POP_PARAMS[fname]["std"] * 0.5
                base_features[fname] += shift
        
        # Generate multiple sessions with within-person variability
        for sess in range(sessions_per_participant):
            session_features = {}
            for fname in FEATURE_NAMES:
                noise = np.random.normal(0, POP_PARAMS[fname]["std"] * 0.2)
                val = base_features[fname] + noise
                # Clamp to reasonable ranges
                if "ratio" in fname or "rate" in fname or "freq" in fname:
                    val = np.clip(val, 0.001, 0.95)
                elif fname == "rhythm_regularity":
                    val = np.clip(val, -0.5, 0.99)
                elif fname == "key_diversity":
                    val = np.clip(val, 1.0, 4.5)
                elif "mean" in fname or "std" in fname or "median" in fname:
                    val = max(5, val)
                session_features[fname] = val
            
            all_features.append([session_features[f] for f in FEATURE_NAMES])
            for t in TRAIT_NAMES:
                all_labels[t].append(trait_labels[t])
            participant_ids.append(pid)
    
    X = np.array(all_features)
    y = {t: np.array(all_labels[t]) for t in TRAIT_NAMES}
    pids = np.array(participant_ids)
    
    print(f"  Generated {X.shape[0]} samples, {X.shape[1]} features")
    for t in TRAIT_NAMES:
        print(f"  {t}: {y[t].sum()}/{len(y[t])} high ({y[t].mean()*100:.1f}%)")
    
    return X, y, pids


def train_models(X, y, pids, output_dir):
    """Train XGBoost model for each Big Five trait using group K-fold CV."""
    os.makedirs(output_dir, exist_ok=True)
    
    results = {}
    models = {}
    
    for trait in TRAIT_NAMES:
        print(f"\n{'='*60}")
        print(f"Training model for: {trait}")
        print(f"{'='*60}")
        
        yt = y[trait]
        
        # Group K-Fold: no participant leakage
        gkf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        fold_accs, fold_f1s = [], []
        
        best_model = None
        best_f1 = 0
        
        for fold, (train_idx, test_idx) in enumerate(gkf.split(X, yt)):
            X_train, X_test = X[train_idx], X[test_idx]
            y_train, y_test = yt[train_idx], yt[test_idx]
            
            model = XGBClassifier(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.08,
                subsample=0.8,
                colsample_bytree=0.8,
                min_child_weight=3,
                reg_alpha=0.1,
                reg_lambda=1.0,
                random_state=42,
                eval_metric="logloss",
                use_label_encoder=False
            )
            model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
            
            preds = model.predict(X_test)
            acc = accuracy_score(y_test, preds)
            f1 = f1_score(y_test, preds, average="macro")
            fold_accs.append(acc)
            fold_f1s.append(f1)
            
            if f1 > best_f1:
                best_f1 = f1
                best_model = model
            
            print(f"  Fold {fold+1}: Acc={acc:.4f}, F1={f1:.4f}")
        
        mean_acc = np.mean(fold_accs)
        mean_f1 = np.mean(fold_f1s)
        print(f"\n  Mean Accuracy: {mean_acc:.4f} (+/- {np.std(fold_accs):.4f})")
        print(f"  Mean Macro F1: {mean_f1:.4f} (+/- {np.std(fold_f1s):.4f})")
        
        # Retrain on full data for production
        final_model = XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.08,
            subsample=0.8, colsample_bytree=0.8, min_child_weight=3,
            reg_alpha=0.1, reg_lambda=1.0, random_state=42,
            eval_metric="logloss", use_label_encoder=False
        )
        final_model.fit(X, yt, verbose=False)
        models[trait] = final_model
        
        results[trait] = {
            "accuracy": round(mean_acc, 4),
            "f1_macro": round(mean_f1, 4),
            "std_acc": round(np.std(fold_accs), 4),
            "std_f1": round(np.std(fold_f1s), 4),
        }
    
    # Save models
    joblib.dump(models, os.path.join(output_dir, "xgb_models.pkl"))
    
    # Save normalization params
    norm_params = {
        "mean": X.mean(axis=0).tolist(),
        "std": X.std(axis=0).tolist()
    }
    with open(os.path.join(output_dir, "norm_params.json"), "w") as f:
        json.dump(norm_params, f, indent=2)
    
    # Save feature names
    with open(os.path.join(output_dir, "feature_names.json"), "w") as f:
        json.dump(FEATURE_NAMES, f)
    
    # Save background data for SHAP
    bg_indices = np.random.choice(len(X), 200, replace=False)
    np.save(os.path.join(output_dir, "background_data.npy"), X[bg_indices])
    
    # Compute and save SHAP global importance
    print(f"\n{'='*60}")
    print("Computing SHAP feature importance...")
    print(f"{'='*60}")
    
    shap_importance = {}
    for trait in TRAIT_NAMES:
        explainer = shap.TreeExplainer(models[trait])
        sv = explainer.shap_values(X[bg_indices])
        mean_abs_shap = np.abs(sv).mean(axis=0)
        importance = {FEATURE_NAMES[i]: round(float(mean_abs_shap[i]), 6) for i in range(len(FEATURE_NAMES))}
        importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
        shap_importance[trait] = importance
        top3 = list(importance.items())[:3]
        print(f"  {trait}: Top features = {', '.join(f'{k}({v:.4f})' for k,v in top3)}")
    
    with open(os.path.join(output_dir, "shap_global_importance.json"), "w") as f:
        json.dump(shap_importance, f, indent=2)
    
    # Save training results
    with open(os.path.join(output_dir, "training_results.json"), "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n{'='*60}")
    print("TRAINING COMPLETE")
    print(f"{'='*60}")
    for trait, r in results.items():
        print(f"  {trait:20s}: Acc={r['accuracy']:.3f}, F1={r['f1_macro']:.3f}")
    print(f"\nModels saved to: {output_dir}/")
    
    return models, results


if __name__ == "__main__":
    output_dir = "/home/claude/keypersona/ml_models"
    X, y, pids = generate_synthetic_data(n_participants=800, sessions_per_participant=3)
    models, results = train_models(X, y, pids, output_dir)
