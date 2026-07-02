# Redesign du comparateur de logos SYMA

Date : 2026-07-02

## Objectif

Transformer le mini-site SYMA en une experience tres epuree, elegante et centree sur les logos, tout en conservant le comparateur comme interaction principale. Le visiteur doit pouvoir comparer deux affichages de logo, choisir ses couleurs avec des libelles explicites, voter d'abord pour sa palette preferee, puis classer les cinq logos de 1 a 5.

## Direction UI

Le site adopte une direction minimal premium inspiree des recommandations `ui-ux-pro-max` :

- fond clair chaud, texte noir profond, surfaces blanches, bordures fines ;
- typographie sobre et plus editorialisee que le rendu actuel ;
- grands apercus visuels, peu de texte, beaucoup d'espace ;
- controles discrets mais lisibles, avec etats hover/focus nets ;
- pas d'emoji comme icones UI, en particulier suppression des pouces ;
- transitions courtes de 150 a 300 ms, sans deplacement de layout ;
- contraste lisible et cibles tactiles d'au moins 44 px.

## Structure de la page

### En-tete

L'en-tete reste tres discret. Il introduit le projet sans voler l'attention aux logos. Le titre peut rester court : `SYMA Studio`.

### Comparateur principal

Le premier bloc de la page reste un comparateur a deux affichages independants. Il prend toute la largeur disponible de l'ecran, avec une mise en page fluide :

- sur desktop, deux grands panneaux cote a cote ;
- sur mobile, les deux panneaux s'empilent ;
- chaque panneau garde une grande zone d'aperçu logo ;
- sous chaque aperçu, les controles restent rattaches a ce panneau.

Chaque panneau contient :

1. un grand aperçu du logo avec couleur de fond et couleur de logo personnalisables ;
2. une rangee de miniatures des cinq logos ;
3. un selecteur de palette ;
4. une ligne de couleurs `Fond` ;
5. une ligne de couleurs `Logo`.

Au clic sur une miniature, le logo correspondant remplace le logo principal du panneau concerne. Les deux panneaux ne se synchronisent pas entre eux.

### Choix des couleurs

Les controles de couleurs doivent expliciter leur role :

- `Fond` apparait a cote de la ligne de pastilles qui change la couleur de fond ;
- `Logo` apparait a cote de la ligne de pastilles qui change la couleur du logo.

Changer de palette recharge les couleurs disponibles du panneau concerne. Les couleurs s'appliquent immediatement.

## Vote

Le vote devient un parcours separe du comparateur et se fait en deux temps.

### Etape 1 : palette preferee

Le visiteur choisit d'abord sa palette preferee, independamment du logo. Ce choix est stocke comme vote de palette.

### Etape 2 : classement des logos

Ensuite, les cinq logos sont presentes en noir sur fond blanc pour eviter que la couleur influence le classement. Le visiteur attribue un rang unique de 1 a 5 a chaque logo :

- `1` = logo prefere ;
- `5` = logo le moins prefere ;
- chaque rang ne peut etre utilise qu'une seule fois ;
- les cinq logos doivent etre classes avant envoi ;
- les anciens boutons pouce haut/pouce bas et leurs compteurs disparaissent de la page publique.

L'interface de classement doit etre simple : chaque carte logo propose un controle de rang clair, stable et accessible au clavier.

## Identite visiteur

La popup native du navigateur est remplacee par une modale interne soignee. Elle apparait lorsqu'un visiteur doit envoyer un vote ou un message et qu'aucun prenom n'est connu.

La modale contient :

- un titre court ;
- un champ `Votre prenom` ;
- un bouton de validation ;
- un message d'erreur si le champ est vide au moment de valider.

Le prenom et l'identifiant visiteur restent stockes en `localStorage`, comme aujourd'hui.

## Message

La section message est renommee `Un message pour moi`. Elle reste sous le vote.

Le formulaire conserve :

- un champ prenom pre-rempli si connu ;
- un textarea message ;
- un bouton envoyer ;
- un statut de succes ou d'erreur annonce via `role="status"` ou `aria-live`.

Le style doit etre plus premium : champs plus grands, libelles clairs, bordures fines, focus visible.

## Donnees et API

Le modele de vote actuel `up/down` doit evoluer vers deux types de retours :

- un vote de palette preferee ;
- un classement complet des logos.

Le contrat cible est :

- `POST /api/vote` recoit `{ visitorId, name, paletteKey, ranking }`, ou `ranking` est un objet `{ [logoId]: rank }` avec les cinq logos et les rangs uniques `1` a `5`.
- `GET /api/votes` retourne les resultats publics agreges : nombre de votes par palette et score de classement par logo.
- `GET /api/votes` avec authentification admin retourne aussi le detail par visiteur : prenom, palette choisie, classement complet, date.

La page admin devra afficher les nouveaux resultats : palette preferee par visiteur, classement des logos, et synthese agregée lisible.

Les messages conservent le comportement actuel.

## Tests

Les tests doivent couvrir :

- le rendu des libelles `Fond` et `Logo` ;
- le changement de logo par miniature dans chaque panneau ;
- le choix de palette preferee ;
- la validation d'un classement complet et sans doublon ;
- l'envoi des nouvelles donnees de vote a l'API ;
- la modale prenom lorsque l'identite manque ;
- la non-regression du formulaire message.

## Hors perimetre

Ce redesign ne change pas :

- les fichiers SVG sources ;
- le principe de stockage du prenom en local ;
- la page admin au-dela de l'affichage necessaire des nouveaux votes ;
- le deploiement Vercel documente dans `DEPLOY.md`.
