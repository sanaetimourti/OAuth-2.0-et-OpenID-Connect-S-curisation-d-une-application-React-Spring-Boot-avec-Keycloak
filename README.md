# Atelier OAuth 2.0 / OpenID Connect : React + Spring Boot + Keycloak

Atelier pratique du module **Sécurité des systèmes distribués** (Master SDIA, ENSET Mohammedia, Université Hassan II de Casablanca).

Application de **gestion des demandes** dont l'authentification est déléguée à **Keycloak** (OpenID Connect, flux *Authorization Code* avec **PKCE**) et dont l'API est protégée par des **Access Tokens JWT** avec des autorisations par rôle (`USER` / `ADMIN`).

> Projet pédagogique, exécuté en local uniquement. Les identifiants fournis ne doivent jamais être utilisés en production.

---

## Sommaire

1. [Architecture](#architecture)
2. [Structure du projet](#structure-du-projet)
3. [Prérequis](#prérequis)
4. [Installation et démarrage](#installation-et-démarrage)
5. [Configuration de Keycloak](#configuration-de-keycloak)
6. [API REST](#api-rest)
7. [Scénarios de test](#scénarios-de-test)
8. [Sécurité : points à retenir](#sécurité--points-à-retenir)
9. [Dépannage](#dépannage)
10. [Auteur](#auteur)

---

## Architecture

| Composant | Rôle OAuth 2.0 / OIDC | Technologie | Port |
|---|---|---|---|
| Keycloak | Authorization Server / OpenID Provider | Keycloak 26.8.1 (Docker) | 8080 |
| API `demandes-api` | Resource Server | Spring Boot 3.5.x, Spring Security | 8081 |
| Frontend | Client public OIDC | React + Vite + `keycloak-js` | 5173 |

```
┌──────────┐ 1. redirection  ┌───────────┐
│  React   │ ───────────────►│ Keycloak  │
│ (5173)   │◄─────────────── │  (8080)   │
└────┬─────┘ 2. code + PKCE  └─────▲─────┘
     │ 3. échange code → jetons    │ clés publiques (issuer-uri)
     │ 4. Authorization: Bearer    │
     ▼                             │
┌──────────────┐ 5. validation JWT │
│ Spring Boot  │ ──────────────────┘
│   (8081)     │ 6. ressources autorisées selon le rôle
└──────────────┘
```

## Structure du projet

```
atelier-oauth2/
├── docker-compose.yml        # Keycloak (mode start-dev)
├── backend/                  # API Spring Boot (demandes-api)
│   └── src/main/java/ma/formation/demandesapi/
│       ├── SecurityConfig.java       # règles d'accès, conversion des rôles, CORS
│       └── DemandeController.java    # endpoints REST
└── demandes-front/           # Application React (Vite)
    └── src/
        ├── keycloak.js       # instance Keycloak
        ├── main.jsx          # init OIDC (login-required, PKCE S256)
        ├── api.js            # appels REST avec Bearer token
        └── App.jsx           # interface
```

## Prérequis

- Docker Desktop
- Java 17 ou 21
- Maven (ou le wrapper `mvnw` fourni)
- Node.js et npm
- Un navigateur web et, pour les tests d'API, Postman

## Installation et démarrage

Démarrer les trois composants **dans cet ordre**, chacun dans son terminal.

### 1. Keycloak

```bash
docker compose up -d
docker compose logs -f keycloak   # optionnel : suivre les journaux
```

Console d'administration : <http://localhost:8080> (compte temporaire de bootstrap : `admin` / `admin`).

### 2. Backend Spring Boot

```bash
cd backend
./mvnw spring-boot:run          # Linux / macOS
.\mvnw.cmd spring-boot:run      # Windows PowerShell
```

Vérification : <http://localhost:8081/api/public> doit répondre :

```json
{ "message": "API publique accessible" }
```

### 3. Frontend React

```bash
cd demandes-front
npm install
npm run dev
```

Ouvrir <http://localhost:5173> : le navigateur est redirigé vers la page de connexion Keycloak.

## Configuration de Keycloak

Le Realm n'est pas importé automatiquement : il se configure une fois dans la console d'administration.

**Realm** : `enset-realm`

**Client** `react-client` :

| Paramètre | Valeur |
|---|---|
| Type | OpenID Connect |
| Client authentication | Off (client public) |
| Standard flow | On |
| Implicit flow | Off |
| Direct access grants | Off |
| Root URL / Home URL | `http://localhost:5173/` |
| Valid redirect URIs | `http://localhost:5173/*` |
| Web origins | `http://localhost:5173` |
| PKCE Code Challenge Method | `S256` |

**Realm roles** : `USER`, `ADMIN` (rôles de Realm, présents dans le JWT sous `realm_access.roles`).

**Utilisateurs** (mot de passe non temporaire) :

| Utilisateur | Mot de passe | Rôles |
|---|---|---|
| `alice` | `alice123` | `USER` |
| `bob` | `bob123` | `USER`, `ADMIN` |

Côté backend, `application.properties` :

```properties
server.port=8081
spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8080/realms/enset-realm
```

## API REST

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/api/public` | Public | Message de test |
| GET | `/api/demandes` | USER, ADMIN | Demandes de l'utilisateur connecté (filtrées sur le claim `sub`) |
| POST | `/api/demandes` | USER, ADMIN | Crée une demande (statut `EN_ATTENTE`) |
| GET | `/api/admin/demandes` | ADMIN | Toutes les demandes |
| PATCH | `/api/admin/demandes/{id}` | ADMIN | Change le statut : `EN_ATTENTE`, `VALIDEE` ou `REFUSEE` |
| GET | `/api/profil` | Authentifié | Identifiant et nom d'utilisateur extraits du JWT (travail supplémentaire) |

Les demandes sont stockées **en mémoire** : elles disparaissent au redémarrage du backend.

Exemple d'appel :

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:8081/api/demandes
```

## Scénarios de test

**Fonctionnels (interface React)**

1. Se connecter en `alice` : son nom et son rôle `USER` s'affichent, elle crée et consulte ses demandes, le panneau *Administration* est absent.
2. Se déconnecter puis se connecter en `bob` : le panneau *Administration* est visible, il voit toutes les demandes et peut les **valider** ou les **refuser**.

**Sécurité (Postman ou curl)**

| Test | Résultat attendu |
|---|---|
| `GET /api/demandes` sans token | `401 Unauthorized` |
| Token dont un caractère est modifié | `401 Unauthorized` |
| `GET /api/admin/demandes` avec le token d'alice | `403 Forbidden` |
| `GET /api/admin/demandes` avec le token de bob | `200 OK` |

## Sécurité : points à retenir

- Masquer le panneau *Administration* dans React n'est **pas** une protection : l'autorisation réelle est appliquée par Spring Security à chaque requête.
- Le propriétaire d'une demande vient du claim `sub` du JWT, jamais d'une valeur envoyée par le frontend.
- PKCE (`S256`) est indispensable pour un client public : le code JavaScript du navigateur ne peut pas garder de secret.
- Les jetons sont conservés en mémoire par `keycloak-js` : ne pas les copier dans `localStorage`.
- Ne jamais publier un Access Token réel (rapport, dépôt Git, capture d'écran).
- `start-dev` et le compte `admin/admin` sont réservés au TP local.

## Dépannage

| Problème | Piste |
|---|---|
| Écran *Update Account Information* à la première connexion | Keycloak exige e-mail, prénom et nom : renseigner ces champs (ou les remplir dans la fiche de l'utilisateur) |
| L'API répond `401` alors que l'utilisateur est connecté | Vérifier que Keycloak est démarré et que `issuer-uri` correspond exactement à `http://localhost:8080/realms/enset-realm` |
| L'API répond `403` pour bob | Vérifier que le rôle `ADMIN` est bien affecté dans *Role mapping* (rôle de Realm, pas de client) |
| Erreur CORS dans la console du navigateur | Le frontend doit tourner sur `http://localhost:5173` (`strictPort` activé dans `vite.config.js`) |
| Redirection Keycloak en erreur (*Invalid redirect URI*) | Vérifier *Valid redirect URIs* et *Web origins* du client `react-client` |
| Port 8080, 8081 ou 5173 déjà utilisé | Arrêter le processus concerné ou le conteneur existant (`docker compose down`) |

Pour tout réinitialiser : `docker compose down -v` supprime aussi le volume Keycloak (Realm, utilisateurs et rôles à recréer).

## Auteur

**TIMOURTI Sana**, Master Systèmes Distribués et Intelligence Artificielle (SDIA), ENSET Mohammedia, Université Hassan II de Casablanca. Année universitaire 2026/2027.
