# Atelier OAuth 2.0 / OpenID Connect — React + Spring Boot + Keycloak

## Prérequis
- Docker Desktop démarré
- Java 21
- Maven installé (ou Maven Wrapper)
- Node.js et npm

## 1. Démarrer Keycloak
À la racine `atelier-oauth2` :
```powershell
docker compose up -d
docker compose logs -f keycloak
```
Ouvrir http://localhost:8080 — administration : `admin` / `admin`.

Le realm `enset-realm`, le client `react-client`, les rôles et les deux utilisateurs sont importés automatiquement lors du premier démarrage.

Comptes du TP :
- Alice : `alice` / `alice123` (USER)
- Bob : `bob` / `bob123` (USER + ADMIN)

## 2. Démarrer Spring Boot
Dans un deuxième terminal :
```powershell
cd backend
mvn spring-boot:run
```
Si Maven Wrapper existe dans le projet : `.\mvnw.cmd spring-boot:run`.

Vérifier : http://localhost:8081/api/public

## 3. Démarrer React
Dans un troisième terminal :
```powershell
cd frontend
npm install
npm run dev
```
Ouvrir http://localhost:5173. La page redirige vers Keycloak.

## 4. Tests à réaliser
1. Connecter Alice : créer une demande et consulter uniquement ses demandes.
2. Vérifier que le panneau Administration n'est pas visible pour Alice.
3. Se déconnecter puis connecter Bob : consulter toutes les demandes, valider et refuser.
4. Sans token, `GET http://localhost:8081/api/demandes` doit répondre 401.
5. Avec le token Alice, `GET http://localhost:8081/api/admin/demandes` doit répondre 403.
6. Avec le token Bob, la même requête doit répondre 200.
7. `GET http://localhost:8081/api/profil` renvoie l'identifiant et le nom d'utilisateur.

## Notes
- Les demandes sont stockées en mémoire : elles sont perdues au redémarrage du backend, comme demandé dans le TP.
- Les mots de passe et identifiants fournis sont réservés à cet atelier local. Ne pas les réutiliser en production.
- Le panneau ADMIN côté React améliore l'interface, mais la vraie sécurité est imposée par Spring Security côté backend.
