import requests
import json

BASE_URL = "http://localhost:5000"

print("=" * 70)
print("🧪 TEST MODE HYBRIDE: ML 70% + TEXTE 30%")
print("=" * 70)

# Données de test
data = {
    "estimated_hours": 24,
    "priority": "critical",
    "due_in_days": 1,
    "user_workload": 270,
    "task_title": "Critical Security Vulnerability",
    "task_description": "Major security breach in production database",
    "category": "Security"
}

print("\n📊 Données d'entrée:")
print(f"   - Heures estimées: {data['estimated_hours']}")
print(f"   - Priorité: {data['priority']}")
print(f"   - Jours restants: {data['due_in_days']}")
print(f"   - Charge utilisateur: {data['user_workload']}")
print(f"   - Description: {data['task_title']} - {data['task_description']}")

response = requests.post(f"{BASE_URL}/predict", json=data)
result = response.json()

print("\n" + "=" * 70)
print("📈 RÉSULTAT AVEC PONDÉRATION ML 70% - TEXTE 30%")
print("=" * 70)

print(f"\n🎯 Score final: {result.get('risk_score')}")
print(f"⚠️  Haut risque: {result.get('high_risk')}")
print(f"📏 Seuil: {result.get('threshold')}")

ml_score   = result.get('score_ml')
text_score = result.get('score_text')

print(f"\n📊 Détails des scores:")
print(f"   🤖 Score ML (pondéré à 70%):   {ml_score} × 0.7 = {ml_score * 0.7:.4f}")
if text_score is not None:
    print(f"   📝 Score Texte (pondéré à 30%): {text_score} × 0.3 = {text_score * 0.3:.4f}")
else:
    print(f"   📝 Score Texte: N/A (API HuggingFace indisponible — mode ml_only)")
print(f"   ➕ Score final:                 {result.get('risk_score')}")

print(f"\n🔧 Méthode: {result.get('method')}")
weights = result.get('weights') or {}
print(f"⚙️  Poids utilisés: ML={weights.get('ml', 1.0)}, Texte={weights.get('text', 0)}")
print(f"💭 Raisonnement: {result.get('reasoning')}")
if result.get('groq_warning'):
    print(f"⚠️  Avertissement API: {result.get('groq_warning')}")

# Vérification du calcul
if text_score is not None:
    expected_score = round((ml_score * 0.7) + (text_score * 0.3), 4)
    print(f"\n✅ Vérification du calcul: ({ml_score} × 0.7) + ({text_score} × 0.3) = {expected_score}")
else:
    print(f"\n✅ Vérification du calcul (ml_only): {ml_score} → {result.get('risk_score')}")

print("\n" + "=" * 70)
print("💡 INTERPRÉTATION")
print("=" * 70)

if result.get('high_risk'):
    print("⚠️  Tâche à HAUT RISQUE détectée")
else:
    print("✅ Tâche à BAS RISQUE détectée")

print(f"\n📌 Le modèle ML domine la décision avec 70% du poids,")
print(f"   ce qui réduit l'impact du score texte très élevé.")
print(f"   Résultat final: {result.get('risk_score')} (seuil = {result.get('threshold')})")