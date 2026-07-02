# Classement drag & drop + bandeau d'envoi — Design

Date : 2026-07-02

## Objectif

Refondre la section « préférences » du site de présentation de logos SYMA :

1. Remplacer le classement par menus déroulants « Rang » par une **liste verticale glisser-déposer** (pré-ordonnée, réordonnable, avec affordance visuelle et micro-animations).
2. Mettre le **hero d'accueil sur une seule ligne** (titre + phrase, sur desktop).
3. Retirer le bouton d'envoi actuel et le formulaire message de la page ; **rien n'est sélectionné au départ** (aucune palette active).
4. Introduire un **bandeau d'envoi (bottom sheet)** qui surgit du bas à la première interaction (choix de palette ou déplacement d'un logo), regroupant palette choisie + ordre des logos + message + prénom + bouton Envoyer.

## Décision d'architecture : fusion message + vote

Aujourd'hui : vote (`/api/vote` → palette + classement) et message (`/api/message` → liste « Messages » admin) sont séparés. **Décision validée : fusionner.** Un clic « Envoyer » dans le bandeau = **un seul envoi** vers `/api/vote` contenant `{ visitorId, name, paletteKey, ranking, message? }`. Le message (optionnel) est stocké dans l'enregistrement de vote et affiché par votant dans l'admin.

Conséquences :
- L'ancien formulaire message de la page est retiré (`js/feedback-form.js` n'est plus câblé ; la `<section class="feedback-section">` disparaît d'`index.html`).
- Les endpoints `/api/message` et `/api/messages`, leurs tests, leurs routes dans `dev-server.js`, et la section « Messages » de l'admin sont **supprimés** (code mort après fusion).

## Modèle de données

### Classement : d'un objet de rangs à un ordre

Avant : `ranking = { logo1: '3', logo2: '1', ... }` (objet logo→rang, saisi via menus, validable/incomplet).

Après : le front manipule un **ordre** — un tableau d'ids de logos, ex. `order = ['logo1', 'logo2', ..., 'logo7']`. Le rang d'un logo = son index + 1. L'ordre est toujours une permutation complète des 7 logos → **toujours valide** (plus de doublons ni de trous possibles).

Au moment de l'envoi, l'ordre est converti en `ranking` (objet `{ logoId: rang }`) pour rester compatible avec le format de stockage et `computeRankedVoteSummary` existant.

### Enregistrement de vote (Redis, hash `votes`, clé = visitorId)

```json
{ "name": "...", "paletteKey": "palette1", "ranking": { "logo1": 3, ... }, "message": "...", "ts": 0 }
```

`message` est optionnel (absent ou chaîne nettoyée non vide).

## Composants front

### `js/ranking-order.js` (logique pure, testée)
- `defaultOrder()` → `LOGO_IDS` dans l'ordre par défaut (tableau).
- `moveItem(order, fromIndex, toIndex)` → nouvel ordre avec l'élément déplacé (pur, sans mutation).
- `orderToRanking(order)` → `{ logoId: rang }` où rang = index + 1.

### `js/ranking-list.js` — liste verticale drag & drop (DOM)
- Rend une liste `<ol>`/`<ul>` verticale : une ligne par logo, dans l'ordre courant.
- Chaque ligne : poignée de glisse (icône ⠿, `cursor: grab`, focusable clavier), badge de rang (1–7, renuméroté en direct), miniature du logo (SVG neutre noir sur blanc), nom du logo.
- **Réorganisation par Pointer Events** (souris + tactile) :
  - `pointerdown` sur la poignée (ou la ligne) → capture du pointeur, la ligne devient « soulevée » (classe `is-dragging` : `scale(1.02)`, ombre portée, suit le pointeur en `translateY`).
  - Pendant le glissement → calcul de l'index cible selon la position ; les autres lignes se décalent via transition CSS (`transform`) pour ménager l'espace.
  - `pointerup` → l'ordre est recalculé via `moveItem`, la ligne se cale avec une transition, les rangs se renumérotent.
- **Clavier** : poignée focusable ; `ArrowUp`/`ArrowDown` déplacent la ligne d'un cran (via `moveItem`), focus conservé.
- **Micro-animations** : hover ligne → léger soulèvement + poignée accentuée ; drag start → `scale` + ombre ; réorganisation → coulissement des voisines ; dépôt → transition de calage. `prefers-reduced-motion` respecté (transitions désactivées).
- Callback `onChange(order)` émis à chaque réorganisation (pour déclencher/mettre à jour le bandeau).
- Callback `onFirstInteraction()` au premier déplacement (pour faire surgir le bandeau).

### `js/submission-bar.js` — bandeau d'envoi (bottom sheet)
- Élément `position: fixed` en bas, `transform: translateY(100%)` masqué → `translateY(0)` visible (transition), coins hauts arrondis uniquement.
- API : `show()`, `update({ paletteKey, order })`, `setStatus(text)`, et gère lui-même le champ message, le champ prénom et le bouton Envoyer.
- Contenu :
  - Résumé palette : nom + mini pastilles de la palette choisie, ou invite « Choisissez une palette » si aucune.
  - Résumé ordre : rangs 1→7 avec noms (ou miniatures) des logos dans l'ordre courant.
  - Champ message (textarea, optionnel).
  - Champ prénom (pré-rempli via `getIdentity()` si connu).
  - Bouton **Envoyer**, **désactivé tant qu'aucune palette n'est choisie** (indice « Choisissez une palette pour envoyer »).
- Sur Envoyer : lit le prénom du champ (défaut « Anonyme » si vide, comme `sanitizeName`), persiste le prénom (`setName`), génère/récupère le `visitorId` (`ensureIdentity` sans prompt puisque le prénom vient du champ), convertit l'ordre en ranking, POST `/api/vote` avec le message optionnel. Confirmation inline (« Merci [prénom], c'est envoyé ✓ »). Renvoyer met à jour le vote (upsert par visitorId).
- Erreur réseau/non-2xx → message d'erreur inline, pas de crash.
- Responsive : pleine largeur en bas sur mobile ; barre ancrée en bas sur desktop.

### `js/votes-section.js` — refonte du contrôleur
- `paletteKey` démarre à **`null`** (aucune sélection).
- `order` démarre à `defaultOrder()`.
- Rend le choix de palette (cartes Palette 1/2, aucune active au départ) + la liste drag & drop (via `ranking-list`).
- Clic sur une palette → `paletteKey = key`, `submissionBar.show()` + `update()`, re-render des cartes (active).
- Première interaction avec les logos (drag) → `submissionBar.show()` ; tout changement d'ordre → `submissionBar.update()`.
- Hydratation d'un votant existant : si `getIdentity().id` a déjà voté, pré-remplir `paletteKey` + `order` depuis `data.myVote`, afficher le bandeau en état « déjà envoyé ».
- L'ancien code (menus « Rang », `createEmptyRanking`, `hasCompleteRanking`, `withRankSelection`, `getRankChoices`, `normalizeRanking`, bouton d'envoi interne, `submitVote` interne) est retiré/remplacé.
- Le prénom étant désormais saisi dans le bandeau, la **modale d'identité devient inutilisée** : `main.js` ne la câble plus, le module de modale d'identité et le `<div id="identity-modal-root">` d'`index.html` sont supprimés (le bandeau utilise directement `getIdentity`/`ensureIdentity`/`setName`).

## Hero (une ligne)

`css/dev-immersive.css` : titre `.intro-title` et phrase `.intro-lede` sur **une seule ligne sur desktop** (`white-space: nowrap` au-dessus d'un breakpoint, ou taille ajustée), retour au multi-ligne sous ~720px pour rester lisible. La copie de la phrase peut être raccourcie si nécessaire pour tenir sur une ligne aux largeurs desktop courantes.

## API / backend

- `api/vote.js` : accepter `message` optionnel dans le body, le nettoyer via `sanitizeMessage`, l'inclure dans l'enregistrement seulement s'il est non vide. Continuer d'exiger `visitorId`, `paletteKey` valide, `ranking` valide (palette obligatoire, cohérent avec le bandeau).
- `api/_lib/voteLogic.js` : `computeRankedVoteSummary` inclut `message` dans chaque objet votant.
- `api/messages.js`, `api/message.js` : **supprimés**.
- `dev-server.js` : retirer les routes `/api/message` et `/api/messages`.

## Admin

- `js/admin.js` : afficher le message de chaque votant dans la vue votants (à côté de sa palette + son classement). Retirer la section « Messages » et les appels à `/api/messages`.
- `admin.html` : retirer le bloc « Messages ».

## Tests

- **Nouveau** `tests/ranking-order.test.js` : `defaultOrder` (7 ids), `moveItem` (déplacement haut/bas, pas de mutation de l'entrée), `orderToRanking` (index+1, permutation).
- **Mise à jour** `tests/api-vote.test.js` : le vote stocke `message` quand fourni ; l'absence de message n'ajoute pas la clé.
- **Mise à jour** `tests/voteLogic` (fichier existant) : `computeRankedVoteSummary` renvoie `message` par votant.
- **Suppression** des tests `/api/message` et `/api/messages`.
- **Suppression/adaptation** des tests de l'ancien modèle de rangs dans le fichier de test de la section vote (les fonctions `hasCompleteRanking`/`withRankSelection`/etc. disparaissent).
- La logique DOM (drag, bandeau) n'a pas de test unitaire (pur câblage) — vérification manuelle au navigateur réel (Playwright + Chrome) : surgissement du bandeau, réordonnancement souris + tactile simulé, envoi bout-en-bout, état « déjà envoyé », désactivation du bouton sans palette, hero sur une ligne.

## Hors périmètre

- Pas de changement au comparateur (deux panneaux du haut) ni à ses favicons.
- Pas de changement au schéma d'auth admin ni aux palettes/logos.
- Pas de rate-limiting (suivi séparé).
