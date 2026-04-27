import pandas as pd, numpy as np, pickle, warnings, os
warnings.filterwarnings('ignore')

from sklearn.ensemble import (RandomForestClassifier, ExtraTreesClassifier,
                               StackingClassifier,
                               HistGradientBoostingClassifier)
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (roc_auc_score, accuracy_score, f1_score,
                              average_precision_score, confusion_matrix,
                              classification_report)
from sklearn.model_selection import StratifiedKFold, cross_val_score
from imblearn.over_sampling import SMOTE
import xgboost as xgb

CSV_PATH = os.path.join(os.path.dirname(__file__), "TASK_MANAGEMENT.csv")

print("Chargement du dataset...")
df = pd.read_csv(CSV_PATH)
df['created_date'] = pd.to_datetime(df['created_date'])
df['due_date']     = pd.to_datetime(df['due_date'])

TODAY = pd.Timestamp('2025-04-25')
df['days_until_due'] = (df['due_date'] - TODAY).dt.days
df['days_total']     = (df['due_date'] - df['created_date']).dt.days.clip(lower=1)

# ── Label : 1 = à risque, 0 = pas à risque ───────────────────────────────────
# Approche par score composite → seuil 0.45
def compute_risk_label(row):
    status    = row['status']
    overdue   = row['days_until_due'] < 0
    overdue_d = abs(row['days_until_due']) if overdue else 0
    p         = row['priority']
    cr        = row['user_completion_rate']
    exp       = row['user_experience_months']
    wl        = row['user_workload']
    eh        = row['estimated_hours']

    # États terminaux clairs
    if status == 'Blocked':
        return 1
    if status == 'Completed':
        ah = row['actual_hours']
        if pd.notna(ah) and ah > 0 and eh > 0:
            # Tâche fortement sous-estimée = difficile en réalité
            return int(ah / eh > 2.2)
        return 0
    if status == 'Under Review':
        # Quasi-terminé, à risque seulement si très en retard
        return int(overdue and overdue_d > 45)

    # Statuts actifs : Open, Pending, In Progress
    risk = 0.0

    # Retard (signal le plus fort)
    if overdue:
        risk += min(0.55, 0.12 + overdue_d / 110)

    # Priorité
    risk += {'Critical': 0.30, 'High': 0.20, 'Medium': 0.10, 'Low': 0.02}.get(p, 0.05)

    # Taux de complétion historique faible → risque plus élevé
    risk += (1.0 - cr) * 0.25

    # Inexpérience de l'assigné
    if exp < 12:   risk += 0.15
    elif exp < 24: risk += 0.08
    elif exp < 36: risk += 0.03

    # Surcharge de travail
    if wl > 275:  risk += 0.10
    elif wl > 260: risk += 0.05

    # Modificateur de statut
    if status == 'In Progress':
        risk -= 0.05   # actif = léger avantage
    elif status in ('Open', 'Pending'):
        if overdue: risk += 0.08  # pas encore commencé ET en retard

    return int(risk >= 0.45)


print("Calcul des labels...")
df['at_risk']      = df.apply(compute_risk_label, axis=1)
df['priority_num'] = df['priority'].map({'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3})
df['due_in_days']  = df['days_until_due']
df['is_overdue']   = (df['due_in_days'] < 0).astype(int)

# ── Feature engineering ───────────────────────────────────────────────────────
df['hours_per_day']      = (df['estimated_hours'] / df['days_total']).clip(0, 20)
df['priority_x_overdue'] = df['priority_num'] * df['is_overdue']
df['workload_pressure']  = df['user_workload'] * (1.0 - df['user_completion_rate'])
df['exp_risk']           = 1.0 / (1.0 + df['user_experience_months'] / 24.0)
df['scope_index']        = (df['story_points'] * df['estimated_hours']).clip(0, 500)

FEATURES = [
    'estimated_hours',        # taille de la tâche
    'priority_num',           # priorité encodée 0-3
    'due_in_days',            # jours restants (négatif = en retard)
    'user_workload',          # charge de travail de l'assigné
    'user_completion_rate',   # taux de complétion historique
    'is_overdue',             # flag binaire retard
    'user_experience_months', # expérience de l'assigné  ← ABSENT avant
    'story_points',           # complexité de la tâche
    'num_comments',           # activité / blocages discutés
    'days_total',             # durée totale allouée
    'hours_per_day',          # intensité (heures/jour)
    'priority_x_overdue',     # interaction priorité × retard
    'workload_pressure',      # pression combinée charge × (1 - taux)
    'exp_risk',               # risque lié à l'inexpérience
    'scope_index',            # étendue = story_points × heures
]

X = df[FEATURES].values.astype(float)
y = df['at_risk'].values

print(f"\nDataset: {X.shape} | at_risk: {y.mean():.2%}")
print(f"  Taux en retard  : {df['is_overdue'].mean():.1%}")
print(f"  due_in_days     : [{df['due_in_days'].min():.0f}, {df['due_in_days'].max():.0f}]")
print(f"  completion_rate : [{df['user_completion_rate'].min():.2f}, {df['user_completion_rate'].max():.2f}]")

# ── SMOTE ─────────────────────────────────────────────────────────────────────
print("\nApplication SMOTE...")
smote        = SMOTE(random_state=42)
X_res, y_res = smote.fit_resample(X, y)
scaler       = StandardScaler()
X_res_sc     = scaler.fit_transform(X_res)
X_sc         = scaler.transform(X)

# ── Estimateurs de base ───────────────────────────────────────────────────────
print("Définition des estimateurs...")
xgb_m = xgb.XGBClassifier(
    n_estimators=600, max_depth=6, learning_rate=0.02,
    subsample=0.8, colsample_bytree=0.7,
    min_child_weight=3, gamma=0.1,
    reg_alpha=0.1, reg_lambda=1.0,
    eval_metric='logloss', random_state=42, n_jobs=-1)

hgb_m = HistGradientBoostingClassifier(
    max_iter=600, max_depth=6, learning_rate=0.02,
    min_samples_leaf=15, l2_regularization=0.1,
    random_state=42)

rf_m = RandomForestClassifier(
    n_estimators=400, max_depth=10, min_samples_leaf=8,
    max_features='sqrt', random_state=42, n_jobs=-1)

et_m = ExtraTreesClassifier(
    n_estimators=300, max_depth=10, min_samples_leaf=8,
    max_features='sqrt', random_state=42, n_jobs=-1)

# ── Stacking avec méta-apprenant LR ──────────────────────────────────────────
print("Entraînement StackingClassifier (XGB + HGB + RF + ET → LR)...")
meta_lr = LogisticRegression(max_iter=3000, C=0.5, random_state=42)
stack = StackingClassifier(
    estimators=[('xgb', xgb_m), ('hgb', hgb_m), ('rf', rf_m), ('et', et_m)],
    final_estimator=meta_lr,
    cv=5, passthrough=False, n_jobs=-1)
stack.fit(X_res_sc, y_res)

# ── Cross-validation 5-fold ────────────────────────────────────────────────────
print("Cross-validation (5-fold)...")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_auc = cross_val_score(stack, X_sc, y, cv=cv, scoring='roc_auc', n_jobs=-1)
cv_apr = cross_val_score(stack, X_sc, y, cv=cv, scoring='average_precision', n_jobs=-1)
print(f"  CV AUC-ROC : {cv_auc.mean():.4f} ± {cv_auc.std():.4f}")
print(f"  CV AUC-PR  : {cv_apr.mean():.4f} ± {cv_apr.std():.4f}")

# ── Calibration isotonique des probabilités ────────────────────────────────────
print("Calibration des probabilités (isotonic)...")
calibrated = CalibratedClassifierCV(stack, method='isotonic', cv='prefit')
calibrated.fit(X_sc, y)

# ── Seuil optimal (macro-F1) ──────────────────────────────────────────────────
print("Recherche du seuil optimal...")
proba        = calibrated.predict_proba(X_sc)[:, 1]
best_t, best_f1 = 0.5, 0
for t in np.arange(0.20, 0.80, 0.005):
    p = (proba >= t).astype(int)
    f = f1_score(y, p, average='macro')
    if f > best_f1:
        best_f1, best_t = f, t

preds           = (proba >= best_t).astype(int)
tn, fp, fn, tp2 = confusion_matrix(y, preds).ravel()
prec = tp2 / (tp2 + fp) if (tp2 + fp) else 0
rec  = tp2 / (tp2 + fn) if (tp2 + fn) else 0
f1v  = 2 * prec * rec / (prec + rec) if (prec + rec) else 0

print("\n========== RÉSULTATS ==========")
print(f"Seuil     : {best_t:.3f}")
print(f"Accuracy  : {accuracy_score(y, preds):.4f}")
print(f"AUC-ROC   : {roc_auc_score(y, proba):.4f}")
print(f"AUC-PR    : {average_precision_score(y, proba):.4f}")
print(f"CV AUC    : {cv_auc.mean():.4f} ± {cv_auc.std():.4f}")
print(f"Precision : {prec:.4f}")
print(f"Recall    : {rec:.4f}")
print(f"F1        : {f1v:.4f}")
print(f"TP={tp2}  FP={fp}  TN={tn}  FN={fn}")
print("================================\n")
print(classification_report(y, preds, target_names=['not_at_risk', 'at_risk']))

# Feature importances XGB
print("Feature importances (XGB component):")
xgb_fitted = stack.estimators_[0]  # XGB is index 0
for name, imp in sorted(zip(FEATURES, xgb_fitted.feature_importances_), key=lambda x: -x[1]):
    print(f"  {name:25s}: {imp:.4f}")

# ── Sauvegarde ────────────────────────────────────────────────────────────────
bundle = {
    'model':                          calibrated,
    'scaler':                         scaler,
    'features':                       FEATURES,
    'threshold':                      float(best_t),
    'priority_map':                   {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
    'user_completion_rate_default':   float(df['user_completion_rate'].mean()),
    'user_experience_months_default': float(df['user_experience_months'].median()),
    'story_points_default':           float(df['story_points'].median()),
    'num_comments_default':           float(df['num_comments'].median()),
    'days_total_default':             float(df['days_total'].median()),
}
out_path = os.path.join(os.path.dirname(__file__), "model_4feat.pkl")
with open(out_path, 'wb') as f:
    pickle.dump(bundle, f)

print(f"\nModèle sauvegardé : {out_path}")
print("Lancez maintenant : python3 app.py")
