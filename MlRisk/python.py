# -*- coding: utf-8 -*-
"""
API DE PRÉDICTION DES RISQUES DE PROJET
Endpoint REST pour tester le modèle de Machine Learning

Auteur: Assistant IA
Date: 2026-04-24
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime
import joblib
import os

# Initialisation de l'application Flask
app = Flask(__name__)
CORS(app)  # Permet les requêtes depuis n'importe quel domaine (pour tester depuis un navigateur)

# Variables globales pour le modèle
model = None
feature_columns = None

# ============================================
# 1. FONCTIONS D'ENTRAÎNEMENT ET DE CHARGEMENT DU MODÈLE
# ============================================

def train_and_save_model(csv_path='TASK MANAGEMENT.csv'):
    """
    Entraîne le modèle sur le fichier CSV et le sauvegarde sur disque.
    Cette fonction est appelée au démarrage de l'API.
    """
    global model, feature_columns
    
    print("🔄 Chargement et entraînement du modèle...")
    
    # Charger les données
    df = pd.read_csv(csv_path, encoding='utf-8', low_memory=False)
    
    # Sélectionner les colonnes pertinentes
    relevant_columns = [
        'created_date', 'due_date', 'priority', 'category', 'estimated_hours',
        'status'
    ]
    
    df_clean = df[relevant_columns].copy()
    
    # Convertir les dates
    df_clean['created_date'] = pd.to_datetime(df_clean['created_date'], errors='coerce')
    df_clean['due_date'] = pd.to_datetime(df_clean['due_date'], errors='coerce')
    
    # Définir le risque
    def define_risk(row):
        if pd.notnull(row['status']) and row['status'] == 'Completed':
            return 0
        else:
            return 1
    
    df_clean['risk'] = df_clean.apply(define_risk, axis=1)
    
    # Créer les caractéristiques
    df_clean['planned_days'] = (df_clean['due_date'] - df_clean['created_date']).dt.days
    df_clean['estimated_hours_clean'] = pd.to_numeric(df_clean['estimated_hours'], errors='coerce').fillna(0)
    df_clean['workload_estimate'] = df_clean['planned_days'] * df_clean['estimated_hours_clean']
    df_clean['created_dayofweek'] = df_clean['created_date'].dt.dayofweek
    df_clean['created_month'] = df_clean['created_date'].dt.month
    
    # One-hot encoding
    priority_dummies = pd.get_dummies(df_clean['priority'], prefix='priority', dummy_na=False)
    category_dummies = pd.get_dummies(df_clean['category'], prefix='category', dummy_na=False)
    
    # Assembler les caractéristiques
    features_list = ['planned_days', 'estimated_hours_clean', 'workload_estimate',
                     'created_dayofweek', 'created_month']
    
    X = df_clean[features_list].copy()
    X = pd.concat([X, priority_dummies, category_dummies], axis=1)
    y = df_clean['risk']
    
    # Supprimer les NaN
    X = X.dropna()
    y = y.loc[X.index]
    
    # Sauvegarder les colonnes pour les réutiliser plus tard
    feature_columns = X.columns.tolist()
    
    # Entraîner le modèle
    from sklearn.ensemble import RandomForestClassifier
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X, y)
    
    # Sauvegarder le modèle sur disque
    joblib.dump(model, 'risk_model.pkl')
    joblib.dump(feature_columns, 'feature_columns.pkl')
    
    print(f"✅ Modèle entraîné avec succès sur {X.shape[0]} échantillons")
    print(f"   Accuracy: {model.score(X, y):.3f}")
    
    return model, feature_columns

def load_model():
    """Charge le modèle pré-entraîné depuis le disque"""
    global model, feature_columns
    
    if os.path.exists('risk_model.pkl') and os.path.exists('feature_columns.pkl'):
        model = joblib.load('risk_model.pkl')
        feature_columns = joblib.load('feature_columns.pkl')
        print("✅ Modèle chargé depuis le disque")
        return model, feature_columns
    else:
        print("⚠️ Aucun modèle trouvé, entraînement en cours...")
        return train_and_save_model()

# ============================================
# 2. FONCTION DE PRÉDICTION CŒUR
# ============================================

def predict_risk(created_date, due_date, priority, category, estimated_hours):
    """
    Fonction de prédiction interne
    """
    global model, feature_columns
    
    if model is None:
        load_model()
    
    # Créer le DataFrame d'entrée
    input_data = pd.DataFrame({
        'created_date': [pd.to_datetime(created_date)],
        'due_date': [pd.to_datetime(due_date)],
        'priority': [priority],
        'category': [category],
        'estimated_hours': [float(estimated_hours)]
    })
    
    # Ingénierie des caractéristiques
    input_data['planned_days'] = (input_data['due_date'] - input_data['created_date']).dt.days
    # Éviter les valeurs négatives
    input_data['planned_days'] = input_data['planned_days'].clip(lower=0)
    input_data['estimated_hours_clean'] = input_data['estimated_hours']
    input_data['workload_estimate'] = input_data['planned_days'] * input_data['estimated_hours_clean']
    input_data['created_dayofweek'] = input_data['created_date'].dt.dayofweek
    input_data['created_month'] = input_data['created_date'].dt.month
    
    # One-hot encoding pour la priorité
    priority_cols = [f'priority_{p}' for p in ['Low', 'Medium', 'High', 'Critical']]
    for pcol in priority_cols:
        input_data[pcol] = 0
    priority_col_name = f'priority_{priority}'
    if priority_col_name in input_data.columns:
        input_data[priority_col_name] = 1
    
    # One-hot encoding pour la catégorie
    # Prendre toutes les catégories du modèle
    category_cols = [c for c in feature_columns if c.startswith('category_')]
    for ccol in category_cols:
        input_data[ccol] = 0
    category_col_name = f'category_{category}'
    if category_col_name in input_data.columns:
        input_data[category_col_name] = 1
    
    # Sélectionner les mêmes colonnes que l'entraînement
    input_data = input_data[feature_columns]
    
    # Remplacer les NaN par 0 (au cas où)
    input_data = input_data.fillna(0)
    
    # Prédire
    risk_proba = model.predict_proba(input_data)[0, 1]
    
    # Déterminer le niveau de risque
    if risk_proba >= 0.7:
        risk_level = "Élevé"
        prediction = "Risque"
        color_code = "red"
    elif risk_proba >= 0.4:
        risk_level = "Modéré"
        prediction = "Risque"
        color_code = "orange"
    else:
        risk_level = "Faible"
        prediction = "Pas de risque"
        color_code = "green"
    
    return {
        'risk_probability': round(risk_proba, 3),
        'risk_level': risk_level,
        'prediction': prediction,
        'color_code': color_code,
        'estimated_completion_risk': f"{round(risk_proba * 100)}%"
    }

# ============================================
# 3. ENDPOINTS DE L'API
# ============================================

@app.route('/', methods=['GET'])
def home():
    """Page d'accueil avec documentation"""
    return jsonify({
        'name': 'Project Risk Prediction API',
        'version': '1.0.0',
        'description': 'API pour prédire le risque de dépassement des délais d\'un projet',
        'endpoints': {
            '/health': 'GET - Vérifier l\'état de l\'API',
            '/predict': 'POST - Prédire le risque pour un projet (JSON)',
            '/predict/form': 'POST - Prédire le risque (formulaire HTML)',
            '/batch_predict': 'POST - Prédire plusieurs projets en une fois',
            '/stats': 'GET - Obtenir les statistiques du modèle'
        },
        'example': {
            'method': 'POST',
            'url': '/predict',
            'body': {
                'created_date': '2026-05-01',
                'due_date': '2026-05-15',
                'priority': 'High',
                'category': 'Development',
                'estimated_hours': 40
            }
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Vérifier que l'API est opérationnelle"""
    if model is not None:
        status = "healthy"
    else:
        status = "loading"
    return jsonify({
        'status': status,
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Endpoint principal pour la prédiction
    Accepte JSON dans le body de la requête
    """
    try:
        # Récupérer les données JSON
        data = request.get_json()
        
        # Validation des champs requis
        required_fields = ['created_date', 'due_date', 'priority', 'category', 'estimated_hours']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'error': f'Champs manquants: {", ".join(missing_fields)}',
                'required_fields': required_fields
            }), 400
        
        # Validation des priorités
        valid_priorities = ['Low', 'Medium', 'High', 'Critical']
        if data['priority'] not in valid_priorities:
            return jsonify({
                'error': f'Priorité invalide. Valeurs acceptées: {valid_priorities}'
            }), 400
        
        # Effectuer la prédiction
        result = predict_risk(
            created_date=data['created_date'],
            due_date=data['due_date'],
            priority=data['priority'],
            category=data['category'],
            estimated_hours=data['estimated_hours']
        )
        
        # Ajouter les informations d'entrée dans la réponse
        result['input'] = {
            'created_date': data['created_date'],
            'due_date': data['due_date'],
            'priority': data['priority'],
            'category': data['category'],
            'estimated_hours': data['estimated_hours']
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Erreur lors de la prédiction'
        }), 500

@app.route('/predict/form', methods=['POST'])
def predict_form():
    """
    Endpoint pour les formulaires HTML (application/x-www-form-urlencoded)
    """
    try:
        # Récupérer les données du formulaire
        created_date = request.form.get('created_date')
        due_date = request.form.get('due_date')
        priority = request.form.get('priority')
        category = request.form.get('category')
        estimated_hours = request.form.get('estimated_hours')
        
        # Validation
        if not all([created_date, due_date, priority, category, estimated_hours]):
            return jsonify({'error': 'Tous les champs sont requis'}), 400
        
        # Effectuer la prédiction
        result = predict_risk(
            created_date=created_date,
            due_date=due_date,
            priority=priority,
            category=category,
            estimated_hours=float(estimated_hours)
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/batch_predict', methods=['POST'])
def batch_predict():
    """
    Prédire plusieurs projets en une seule requête
    Body: { "projects": [ {project1}, {project2}, ... ] }
    """
    try:
        data = request.get_json()
        
        if 'projects' not in data:
            return jsonify({'error': 'Le champ "projects" est requis'}), 400
        
        projects = data['projects']
        results = []
        
        for i, project in enumerate(projects):
            try:
                result = predict_risk(
                    created_date=project['created_date'],
                    due_date=project['due_date'],
                    priority=project['priority'],
                    category=project['category'],
                    estimated_hours=project['estimated_hours']
                )
                result['project_index'] = i
                results.append(result)
            except Exception as e:
                results.append({
                    'project_index': i,
                    'error': str(e),
                    'prediction': 'Erreur'
                })
        
        return jsonify({
            'total_projects': len(projects),
            'results': results
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/stats', methods=['GET'])
def get_model_stats():
    """Obtenir les statistiques du modèle"""
    if model is None:
        load_model()
    
    # Calculer l'importance des caractéristiques
    feature_importance = dict(zip(feature_columns, model.feature_importances_))
    top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return jsonify({
        'model_type': 'RandomForestClassifier',
        'n_estimators': 100,
        'max_depth': 10,
        'n_features': len(feature_columns),
        'top_10_features': [{'feature': f[0], 'importance': round(f[1], 4)} for f in top_features],
        'status': 'ready'
    })

# ============================================
# 4. DÉMARRAGE DE L'API
# ============================================

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 DÉMARRAGE DE L'API DE PRÉDICTION DES RISQUES")
    print("=" * 60)
    
    # Charger ou entraîner le modèle
    load_model()
    
    print("\n📋 Documentation des endpoints disponible sur: http://localhost:5000/")
    print("\n🔧 Exemple d'utilisation avec curl:")
    print("""
    curl -X POST http://localhost:5000/predict \\
      -H "Content-Type: application/json" \\
      -d '{
        "created_date": "2026-05-01",
        "due_date": "2026-05-15",
        "priority": "High",
        "category": "Development",
        "estimated_hours": 40
      }'
    """)
    
    print("\n🌐 Interface de test: http://localhost:5000/")
    print("=" * 60)
    
    # Démarrer le serveur Flask
    app.run(host='0.0.0.0', port=5000, debug=True)