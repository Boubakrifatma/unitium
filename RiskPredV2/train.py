import pandas as pd, numpy as np, pickle, warnings, os
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, accuracy_score, classification_report, confusion_matrix, f1_score
from imblearn.over_sampling import SMOTE
import xgboost as xgb

# ── Chemin vers le CSV ────────────────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(__file__), "TASK_MANAGEMENT.csv")

print("Chargement du dataset...")
df = pd.read_csv(CSV_PATH)
df['created_date'] = pd.to_datetime(df['created_date'])
df['due_date']     = pd.to_datetime(df['due_date'])
today = pd.Timestamp('2025-04-25')
df['days_until_due'] = (df['due_date'] - today).dt.days

# ── Feature engineering : colonne completed ───────────────────────────────────
def realistic_completed(row):
    status = row['status']
    if status == 'Completed':    return 1
    if status == 'Blocked':      return 0
    if status == 'Under Review': return 1
    overdue   = row['days_until_due'] < 0
    overdue_d = abs(row['days_until_due']) if overdue else 0
    p, r, e   = row['priority'], row['user_completion_rate'], row['user_experience_months']
    if status == 'Open':
        if overdue and overdue_d > 90:                        return 0
        if overdue and p in ['Low', 'Medium']:                return 0
        if overdue and p == 'Critical' and r > 0.85:         return 1
        if not overdue and p == 'Critical':                   return 1
        if not overdue and p == 'Low':                       return 0
        return 0 if overdue else 1
    if status == 'Pending':
        if overdue and overdue_d > 60:                       return 0
        if overdue and p == 'Critical':                      return 1
        if not overdue and r > 0.80:                         return 1
        return 0 if overdue else 1
    if status == 'In Progress':
        if not overdue:
            if p == 'Critical':                              return 1
            if p == 'High' and r > 0.75:                    return 1
            if p == 'Medium' and e > 48 and r > 0.80:       return 1
            if p == 'Low' and row['user_workload'] > 260:   return 0
            return 1 if r > 0.78 else 0
        else:
            if overdue_d > 180:                              return 0
            if p == 'Critical' and overdue_d < 30:          return 1
            if p == 'High' and overdue_d < 60 and r > 0.80: return 1
            if p in ['Low', 'Medium'] and overdue_d > 60:   return 0
            return 0
    return 0

print("Calcul des labels completed...")
df['completed']    = df.apply(realistic_completed, axis=1)
df['priority_num'] = df['priority'].map({'Low':0,'Medium':1,'High':2,'Critical':3})
df['due_in_days']  = df['days_until_due'].clip(lower=0)

FEATURES = ['estimated_hours', 'priority_num', 'due_in_days', 'user_workload']
X = df[FEATURES].values.astype(float)
y = (df['completed'] == 0).astype(int).values

print(f"Dataset: {X.shape} | at_risk: {y.mean():.2%}")

# ── SMOTE ─────────────────────────────────────────────────────────────────────
print("Application SMOTE...")
smote    = SMOTE(random_state=42)
X_res, y_res = smote.fit_resample(X, y)
scaler   = StandardScaler()
X_res_sc = scaler.fit_transform(X_res)
X_sc     = scaler.transform(X)

# ── Ensemble ──────────────────────────────────────────────────────────────────
print("Entrainement de l'ensemble (XGB + RF + GB + LR)...")
xgb_m = xgb.XGBClassifier(
    n_estimators=500, max_depth=5, learning_rate=0.03,
    subsample=0.8, colsample_bytree=0.8,
    min_child_weight=3, gamma=0.1,
    eval_metric='logloss', random_state=42, n_jobs=-1)
rf_m = RandomForestClassifier(
    n_estimators=400, max_depth=8, min_samples_leaf=10,
    max_features='sqrt', random_state=42, n_jobs=-1)
gb_m = GradientBoostingClassifier(
    n_estimators=300, max_depth=4, learning_rate=0.05,
    subsample=0.8, random_state=42)
lr_m = LogisticRegression(max_iter=2000, C=0.3, random_state=42)

ensemble = VotingClassifier(
    estimators=[('xgb',xgb_m),('rf',rf_m),('gb',gb_m),('lr',lr_m)],
    voting='soft', weights=[4,3,2,1])
ensemble.fit(X_res_sc, y_res)

# ── Seuil optimal ─────────────────────────────────────────────────────────────
print("Recherche du seuil optimal...")
proba = ensemble.predict_proba(X_sc)[:,1]
best_t, best_f1 = 0.5, 0
for t in np.arange(0.20, 0.80, 0.005):
    p = (proba >= t).astype(int)
    f = f1_score(y, p, average='macro')
    if f > best_f1: best_f1, best_t = f, t

preds = (proba >= best_t).astype(int)
tn, fp, fn, tp2 = confusion_matrix(y, preds).ravel()
prec = tp2/(tp2+fp) if (tp2+fp) else 0
rec  = tp2/(tp2+fn) if (tp2+fn) else 0
f1v  = 2*prec*rec/(prec+rec) if (prec+rec) else 0

print("\n========== RESULTATS ==========")
print(f"Threshold : {best_t:.3f}")
print(f"Accuracy  : {accuracy_score(y, preds):.4f}")
print(f"AUC       : {roc_auc_score(y, proba):.4f}")
print(f"Precision : {prec:.4f}")
print(f"Recall    : {rec:.4f}")
print(f"F1        : {f1v:.4f}")
print(f"TP={tp2} FP={fp} TN={tn} FN={fn}")
print("================================\n")

# ── Sauvegarde ────────────────────────────────────────────────────────────────
bundle = {
    'model':        ensemble,
    'scaler':       scaler,
    'features':     FEATURES,
    'threshold':    float(best_t),
    'priority_map': {'Low':0,'Medium':1,'High':2,'Critical':3},
}
out_path = os.path.join(os.path.dirname(__file__), "model_4feat.pkl")
with open(out_path, 'wb') as f:
    pickle.dump(bundle, f)

print(f"Modele sauvegarde : {out_path}")
print("Vous pouvez maintenant lancer : python app.py")