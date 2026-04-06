# Guide Postman — Unitum Backend

> Backend : `http://localhost:8084`
> Assure-toi que Spring Boot est démarré avant de tester.

---

## ⚠️ Problème fréquent : 400 Bad Request sur Login

Dans ton screenshot tu es sur l'onglet **Params** — c'est faux.
Pour envoyer du JSON il faut aller dans **Body → raw → JSON**.

---

## ÉTAPE 0 — Comment envoyer un body JSON (à faire pour toutes les requêtes POST/PUT/PATCH)

```
1. Choisis la méthode  →  POST
2. Mets l'URL
3. Clique sur l'onglet  →  Body
4. Coche  →  raw
5. Dans le menu déroulant à droite  →  choisis JSON
6. Écris ton JSON dans la zone de texte
7. Clique Send
```

---

## ÉTAPE 1 — Login (faire EN PREMIER)

```
Méthode  : POST
URL      : http://localhost:8084/api/auth/login
Onglet   : Body → raw → JSON
```

Body à coller :
```json
{
  "email": "yosra.ben.alii17@gmail.com",
  "password": "Yosra123."
}
```

Réponse attendue (200 OK) :
```json
{
  "token": "eyJhbGc...",
  "userId": 12,
  "email": "yosra.ben.alii17@gmail.com",
  "role": "ADMIN"
}
```

> ✅ Copie le `token` — tu en as besoin pour toutes les requêtes suivantes.

---

## ÉTAPE 2 — Comment ajouter le token dans les requêtes protégées

```
1. Ouvre ta requête
2. Clique sur l'onglet  →  Headers
3. Ajoute une ligne :
   Key   : Authorization
   Value : Bearer eyJhbGc...   (colle ton token ici)
```

---

## ÉTAPE 3 — Tester les endpoints

### 🔐 AUTH

#### Vérifier la session
```
Méthode  : GET
URL      : http://localhost:8084/api/auth/me
Headers  : Authorization: Bearer TON_TOKEN
```

#### Logout
```
Méthode  : POST
URL      : http://localhost:8084/api/auth/logout
Headers  : Authorization: Bearer TON_TOKEN
```

#### Statistiques de connexion
```
Méthode  : GET
URL      : http://localhost:8084/api/auth/stats/activity
Headers  : Authorization: Bearer TON_TOKEN
```

#### Envoyer un Magic Link (connexion par email)
```
Méthode  : POST
URL      : http://localhost:8084/api/auth/magic-link
Body     : raw → JSON
```
```json
{
  "email": "yosra.ben.alii17@gmail.com"
}
```

#### Setup 2FA (obtenir le QR code)
```
Méthode  : POST
URL      : http://localhost:8084/api/auth/2fa/setup
Headers  : Authorization: Bearer TON_TOKEN
Body     : (vide)
```

#### Activer 2FA (après avoir scanné le QR)
```
Méthode  : POST
URL      : http://localhost:8084/api/auth/2fa/enable
Headers  : Authorization: Bearer TON_TOKEN
Body     : raw → JSON
```
```json
{
  "secret": "SECRET_RECU_DU_SETUP",
  "code": "123456"
}
```

#### Vérifier code 2FA (si MFA requis au login)
```
Méthode  : POST
URL      : http://localhost:8084/api/auth/2fa/verify
Body     : raw → JSON
```
```json
{
  "userId": 12,
  "code": "123456"
}
```

---

### 👤 USERS

#### Liste des utilisateurs
```
Méthode  : GET
URL      : http://localhost:8084/api/users
Headers  : Authorization: Bearer TON_TOKEN
```

#### Chercher un utilisateur
```
Méthode  : GET
URL      : http://localhost:8084/api/users/search?q=yosra
Headers  : Authorization: Bearer TON_TOKEN
```

#### Créer un utilisateur
```
Méthode  : POST
URL      : http://localhost:8084/api/users
Headers  : Authorization: Bearer TON_TOKEN
Body     : raw → JSON
```
```json
{
  "email": "nouvel.employe@example.com",
  "fullName": "Nouvel Employé",
  "role": "EMPLOYEE",
  "password": "TempPass123!"
}
```

#### Changer le rôle d'un utilisateur
```
Méthode  : PATCH
URL      : http://localhost:8084/api/users/ID_USER/role
Headers  : Authorization: Bearer TON_TOKEN
Body     : raw → JSON
```
```json
{
  "role": "MANAGER"
}
```
> Rôles disponibles : `SUPER_ADMIN` `ADMIN` `MANAGER` `EMPLOYEE` `PRODUCT_OWNER` `VIEWER`

#### Activer / Désactiver un utilisateur
```
Méthode  : PATCH
URL      : http://localhost:8084/api/users/ID_USER/status
Headers  : Authorization: Bearer TON_TOKEN
Body     : raw → JSON
```
```json
{
  "isActive": true
}
```

#### Supprimer un utilisateur
```
Méthode  : DELETE
URL      : http://localhost:8084/api/users/ID_USER
Headers  : Authorization: Bearer TON_TOKEN
```

---

### 🏢 ORGANIZATIONS

#### Mon organisation (récupère l'orgId)
```
Méthode  : GET
URL      : http://localhost:8084/api/organizations/my
Headers  : Authorization: Bearer TON_TOKEN
```
> ✅ Copie l'`id` de la réponse → c'est ton ORG_ID pour les requêtes suivantes.

#### Toutes les organisations (SUPER_ADMIN seulement)
```
Méthode  : GET
URL      : http://localhost:8084/api/organizations
Headers  : Authorization: Bearer TON_TOKEN
```

#### Créer une organisation
```
Méthode  : POST
URL      : http://localhost:8084/api/organizations
Headers  : Authorization: Bearer TON_TOKEN
Body     : raw → JSON
```
```json
{
  "name": "Ma Société",
  "orgType": "ENTERPRISE",
  "description": "Description de test"
}
```
> `orgType` : `ENTERPRISE` ou `ACADEMIC`

#### Modifier une organisation
```
Méthode  : PUT
URL      : http://localhost:8084/api/organizations/ORG_ID
Headers  : Authorization: Bearer TON_TOKEN
Body     : raw → JSON
```
```json
{
  "name": "Nouveau Nom",
  "description": "Nouvelle description"
}
```

#### Supprimer une organisation
```
Méthode  : DELETE
URL      : http://localhost:8084/api/organizations/ORG_ID
Headers  : Authorization: Bearer TON_TOKEN
```

---

### 👥 MEMBRES

#### Liste des membres
```
Méthode  : GET
URL      : http://localhost:8084/api/organizations/ORG_ID/members
Headers  : Authorization: Bearer TON_TOKEN
```

#### Changer le rôle d'un membre
```
Méthode  : PATCH
URL      : http://localhost:8084/api/organizations/ORG_ID/members/MEMBRE_ID/role
Headers  : Authorization: Bearer TON_TOKEN
Body     : raw → JSON
```
```json
{
  "role": "ADMIN"
}
```

#### Retirer un membre
```
Méthode  : DELETE
URL      : http://localhost:8084/api/organizations/ORG_ID/members/MEMBRE_ID
Headers  : Authorization: Bearer TON_TOKEN
```

---

### ✉️ INVITATIONS

#### Inviter quelqu'un (envoie un email)
```
Méthode  : POST
URL      : http://localhost:8084/api/organizations/ORG_ID/members/invite
Headers  : Authorization: Bearer TON_TOKEN
Body     : raw → JSON
```
```json
{
  "email": "invite@example.com",
  "fullName": "Prénom Nom",
  "platformRole": "EMPLOYEE",
  "orgRole": "MEMBER"
}
```
> La personne reçoit un email avec les boutons Accept / Decline.
> Si une invitation est déjà en attente → elle est annulée et une nouvelle est envoyée.

#### Voir les invitations en attente
```
Méthode  : GET
URL      : http://localhost:8084/api/organizations/ORG_ID/invitations
Headers  : Authorization: Bearer TON_TOKEN
```

#### Annuler une invitation
```
Méthode  : DELETE
URL      : http://localhost:8084/api/invitations/ID_INVITATION
Headers  : Authorization: Bearer TON_TOKEN
```

#### Accepter / Refuser une invitation
```
→ À ouvrir dans un NAVIGATEUR (pas dans Postman)

http://localhost:8084/api/invitations/respond?token=TOKEN_DU_MAIL&action=accept
http://localhost:8084/api/invitations/respond?token=TOKEN_DU_MAIL&action=decline
```

---

### 📋 AUDIT LOGS

#### Tous les logs
```
Méthode  : GET
URL      : http://localhost:8084/api/audit-logs
Headers  : Authorization: Bearer TON_TOKEN
```

#### Logs d'un utilisateur spécifique
```
Méthode  : GET
URL      : http://localhost:8084/api/audit-logs/user/ID_USER
Headers  : Authorization: Bearer TON_TOKEN
```

---

## Ordre recommandé pour une démo complète

```
1.  POST  /api/auth/login                              → copier le token
2.  GET   /api/auth/me                                 → vérifier la session
3.  GET   /api/organizations/my                        → copier l'orgId
4.  GET   /api/organizations/ORG_ID/members            → voir les membres actuels
5.  POST  /api/organizations/ORG_ID/members/invite     → inviter quelqu'un
6.  GET   /api/organizations/ORG_ID/invitations        → voir le statut PENDING
7.  (ouvrir le lien du mail dans le navigateur)        → accepter l'invitation
8.  GET   /api/organizations/ORG_ID/members            → vérifier que le membre est ajouté
9.  GET   /api/auth/stats/activity                     → voir les statistiques
10. GET   /api/audit-logs                              → voir l'historique des actions
11. POST  /api/auth/logout                             → terminer la session
```

---

## Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| 400 Bad Request | Body manquant ou mal formaté | Vérifier Body → raw → JSON |
| 401 Unauthorized | Token absent ou expiré | Refaire le login, copier le nouveau token |
| 403 Forbidden | Rôle insuffisant | Utiliser un compte ADMIN ou SUPER_ADMIN |
| 404 Not Found | Mauvais ID dans l'URL | Vérifier l'ORG_ID ou USER_ID |
| 409 Conflict | Doublon (invitation déjà envoyée, membre existant…) | Normal — lire le message d'erreur |
