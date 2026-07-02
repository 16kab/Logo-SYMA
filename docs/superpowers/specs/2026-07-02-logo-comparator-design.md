# Mini-site comparateur de logos SYMA — Design

Date : 2026-07-02

## 1. Objectif

Un mini-site statique pour présenter à des clients 5 propositions de logo, leur permettre de comparer deux rendus côte à côte (logo + couleurs), de voter logo par logo (pouce vert/rouge), et de laisser un message texte libre. L'auteur (Alexis) doit pouvoir consulter tous les retours via une page admin protégée par mot de passe.

Hébergement cible : Vercel, déployé depuis un repo GitHub (connexion faite manuellement par l'utilisateur après livraison du code).

## 2. Stack technique

- **Frontend** : HTML / CSS / JavaScript vanilla, sans framework ni étape de build.
- **Backend** : fonctions serverless Vercel (`/api/*.js`, Node.js) pour lire/écrire les votes et messages.
- **Stockage** : Vercel KV (Upstash Redis), connecté au projet Vercel après import du repo (aucune configuration locale requise, juste des variables d'environnement fournies par Vercel).
- Aucune dépendance frontend (pas de bundler). Côté API, dépendance unique : `@vercel/kv`.

## 3. Assets logos

5 fichiers SVG dans `SVG/` (déjà fournis) :

| Fichier | Nom affiché |
|---|---|
| `FAT.svg` | Logo 1 |
| `Goofy.svg` | Logo 2 |
| `Journal.svg` | Logo 3 |
| `le beau.svg` | Logo 4 |
| `manuscrit.svg` | Logo 5 |

Chaque SVG utilise une seule couleur via une classe CSS interne (`fill: #fff`). Pour recolorer dynamiquement : le SVG est chargé en `fetch()` puis inliné dans le DOM ; tous ses éléments `path`/`text` reçoivent un `style.fill` inline (qui prime toujours sur le `<style>` interne du SVG), permettant d'appliquer n'importe quelle couleur en JS sans toucher aux fichiers sources.

## 4. Palettes de couleurs

Chaque palette contient 5 couleurs + noir + blanc (7 choix au total).

**Palette 1**
`#18233f` `#788ce3` `#92bad4` `#f7f3e7` `#e0f479` `#000000` `#ffffff`

**Palette 2**
`#f35b43` `#610023` `#9f9536` `#f7c6dc` `#f7eee5` `#000000` `#ffffff`

## 5. Page principale (`index.html`)

### 5.1 En-tête
Titre : **"SYMA Studio — Proposition de logo"**.

### 5.2 Comparateur (2 panneaux indépendants : Gauche / Droite)

Chaque panneau possède son propre état, totalement indépendant de l'autre :
- Zone d'aperçu : fond coloré (grand cadre) avec le logo centré dedans.
- Sélecteur de logo : 5 vignettes cliquables (Logo 1 à 5).
- Sélecteur de palette : 2 boutons/onglets (Palette 1 / Palette 2).
- Pastilles de couleur "Fond" : les 7 couleurs de la palette active.
- Pastilles de couleur "Logo" : les 7 couleurs de la palette active.

Changer de palette réinitialise fond et logo sur la 1ère couleur de la nouvelle palette. Les changements s'appliquent instantanément (pas de bouton de validation).

État initial suggéré : panneau gauche = Logo 1, Palette 1, fond `#18233f`, logo `#ffffff` ; panneau droit = Logo 2, Palette 1, fond `#f7f3e7`, logo `#18233f`.

### 5.3 Section votes

Un mini contrôle de couleur **partagé** (au-dessus des 5 logos) : sélecteur Palette 1/2, pastille Fond, pastille Logo (mêmes règles que le comparateur) — appliqué simultanément aux 5 logos affichés côte à côte en dessous.

Sous chaque logo : un bouton 👍 (vert) et un bouton 👎 (rouge), avec le compteur courant à côté (ex. "👍 3 · 👎 1").

**Identification visiteur** : au premier clic sur un pouce ou premier envoi de message, une popup demande un prénom. Un identifiant unique (UUID généré côté client) est créé et stocké avec le prénom dans `localStorage`. Ces deux valeurs accompagnent chaque requête de vote/message envoyée à l'API.

**Règles de vote** : un visiteur (identifié par son UUID) peut voter sur chacun des 5 logos indépendamment. Un vote répété sur le même logo remplace le précédent (pas de cumul, changement d'avis possible). Cliquer sur le pouce déjà actif l'annule (retire le vote).

### 5.4 Message texte libre

Un textarea "Votre message" + bouton "Envoyer", sous la section votes. Le prénom déjà enregistré (localStorage) est réutilisé et affiché (modifiable via un petit champ si le visiteur veut le changer). Chaque envoi crée une nouvelle entrée horodatée ; pas de limite du nombre de messages par visiteur.

## 6. Modèle de données (Vercel KV)

- `vote:<logoId>` → hash Redis, clé = `visitorId`, valeur = JSON `{ "name": "...", "value": "up"|"down", "ts": <epoch ms> }`.
  - Retirer un vote = `HDEL vote:<logoId> <visitorId>`.
  - Les compteurs agrégés (👍/👎) sont calculés à la volée via `HGETALL` côté API (volume attendu trop faible pour justifier un compteur dédié).
- `messages` → liste Redis (`RPUSH`), chaque élément = JSON `{ "name": "...", "message": "...", "ts": <epoch ms> }`. Lecture via `LRANGE` (ordre chronologique inversé à l'affichage).

## 7. API (fonctions serverless Vercel)

- `POST /api/vote` — body `{ logoId, visitorId, name, value }` (`value` = `"up"` | `"down"` | `null` pour retirer). Écrit/supprime l'entrée dans le hash `vote:<logoId>`.
- `GET /api/votes` — retourne l'état agrégé des 5 logos : compteurs 👍/👎 + détail (prénom + valeur) pour la page admin. Utilisé aussi par la page principale pour afficher les compteurs à jour.
- `POST /api/message` — body `{ name, message }`. Fait un `RPUSH` sur `messages`.
- `GET /api/messages` — retourne la liste des messages (réservé à la page admin ; nécessite le header d'auth admin, voir ci-dessous).
- `POST /api/admin-login` — body `{ password }`. Compare au mot de passe stocké dans la variable d'environnement `ADMIN_PASSWORD` sur Vercel. Si correct, retourne un jeton simple (ex. valeur fixe hashée) que le frontend admin garde en `sessionStorage` et renvoie en header `Authorization` sur `/api/votes` (détail) et `/api/messages`.

Remarque de sécurité : les compteurs agrégés de `/api/votes` sont publics (visibles sur la page principale), mais le détail nominatif (qui a voté quoi) n'est renvoyé qu'avec le header d'auth admin valide.

## 8. Page admin (`admin.html`)

- Formulaire mot de passe (si pas de session valide en `sessionStorage`).
- Une fois connecté : tableau des 5 logos avec compteurs 👍/👎 et liste dépliable des votants (prénom + valeur) par logo.
- Liste des messages, du plus récent au plus ancien (prénom, message, date/heure formatée).

## 9. Arborescence du projet

```
index.html
admin.html
/css
  style.css
/js
  main.js        (comparateur + votes + message, logique frontend)
  admin.js        (logique page admin)
/api
  vote.js
  votes.js
  message.js
  messages.js
  admin-login.js
/SVG                (déjà existant)
DEPLOY.md            (instructions de connexion Vercel KV + variables d'env)
```

## 10. Déploiement (hors périmètre de dev, à faire par l'utilisateur)

Documenté dans `DEPLOY.md` : créer le repo GitHub, l'importer dans Vercel, ajouter le store Vercel KV depuis l'onglet Storage du projet (génère automatiquement les variables d'env `KV_REST_API_URL` / `KV_REST_API_TOKEN`), définir `ADMIN_PASSWORD` dans les variables d'environnement du projet Vercel.

## 11. Hors périmètre (explicitement exclu)

- Pas de compte/authentification pour les visiteurs (juste un prénom déclaratif).
- Pas de modération des messages.
- Pas de limite anti-spam au-delà de l'identification par navigateur.
- Pas de design responsive avancé au-delà d'un empilement simple des 2 panneaux sur mobile.
