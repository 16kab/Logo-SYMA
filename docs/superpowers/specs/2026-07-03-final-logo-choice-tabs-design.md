# Choix final logo/palette et onglet iconographie

Date : 2026-07-03

## Objectif

Ajouter au site SYMA un choix final global pour le logo et la palette, visible par tous les visiteurs une fois valide, modifiable par tous, et consultable dans l'espace admin.

Ajouter aussi une navigation en deux onglets :

- `Logo & palette` pour l'experience actuelle et le choix final ;
- `Iconographie` comme espace prepare pour un futur vote, sans visuels definitifs pour l'instant.

## Portee

Cette phase implemente le choix final global pour l'onglet logo. L'onglet iconographie doit exister dans l'interface, mais il reste un etat d'attente tant que les visuels d'iconographie ne sont pas fournis.

Cette phase ne cree pas de faux assets d'iconographie et ne finalise pas encore le modele de vote iconographique.

## Navigation

La page publique affiche une navigation par onglets en haut du contenu principal :

1. `Logo & palette`
2. `Iconographie`

L'onglet `Logo & palette` est actif par defaut. Il contient :

- la section d'introduction actuelle ;
- la nouvelle section de choix final, seulement si un choix global existe ;
- le comparateur actuel ;
- le panneau de vote actuel.

L'onglet `Iconographie` affiche un etat d'attente simple, coherent avec la direction sombre du site. Il indique que la selection iconographique sera ajoutee ensuite. Il ne doit pas afficher de controles de vote actifs tant qu'aucun contenu n'existe.

La navigation utilise une structure `tablist` / `tab` / `tabpanel`, avec `aria-selected` sur l'onglet actif. Les panneaux non actifs sont masques avec `hidden`.

## Bouton de choix final

Dans l'onglet `Logo & palette`, un bouton principal `Valider notre choix` est ajoute pres du comparateur, dans une zone visible sans concurrencer les controles existants.

Le bouton ouvre une popup de selection finale. Si aucun choix final global n'existe, la popup est vierge. Si un choix final existe et que l'utilisateur clique sur `Modifier`, la popup est pre-remplie avec le choix global actuel.

## Popup de selection finale

La popup permet de choisir :

- une palette ;
- un logo ;
- une couleur de fond parmi les couleurs de la palette ;
- une couleur de logo parmi les couleurs de la palette ;
- le prenom associe au choix, pre-rempli depuis l'identite existante si disponible.

Le choix de palette met a jour les couleurs disponibles pour `Fond` et `Logo`, comme dans le comparateur actuel.

La popup affiche un apercu principal du logo avec les couleurs selectionnees. Les controles doivent rester proches de l'apercu pour eviter un parcours trop long.

La popup doit etre accessible :

- role `dialog` ou structure equivalente ;
- titre clair ;
- bouton de fermeture ;
- focus visible ;
- message d'erreur ou statut via `role="alert"` ou `role="status"` ;
- aucune information importante portee uniquement par la couleur.

## Choix final global

Le choix final est unique pour le projet. Il n'est pas stocke par personne. Toute personne ayant acces au lien peut le creer ou le modifier.

Quand un choix final est valide, il remplace le choix final precedent.

Le modele cible stocke :

- `logoId` ;
- `paletteKey` ;
- `bgColor` ;
- `logoColor` ;
- `name` : prenom connu au moment de la validation, si disponible ;
- `updatedAt` : date de derniere validation en millisecondes Unix.

Le prenom vient de l'identite deja saisie dans le vote si elle existe. Si aucun prenom n'est connu et que le champ est laisse vide, le choix reste valide avec `Anonyme` cote admin.

## Rendu public du choix final

Une fois un choix final global disponible, une nouvelle section apparait en haut de l'onglet `Logo & palette`, avant le comparateur.

Cette section contient :

1. un grand apercu full largeur du logo avec la couleur de fond et la couleur de logo choisies ;
2. en dessous, sur une meme ligne quand l'espace le permet :
   - le logo en noir sur fond blanc ;
   - le logo en blanc sur fond noir ;
3. un bouton `Modifier`.

Sur mobile, les deux variantes noir/blanc peuvent s'empiler si necessaire pour rester lisibles.

Le bouton `Modifier` est accessible a tout le monde. Il ouvre la popup pre-remplie avec le choix global actuel. Une validation remplace immediatement le choix global.

## API et stockage

Un nouveau endpoint public gere le choix final :

- `GET /api/final-choice` retourne le choix final global s'il existe ;
- `POST /api/final-choice` valide et remplace le choix final global.

Payload attendu pour `POST /api/final-choice` :

```json
{
  "logoId": "logo1",
  "paletteKey": "palette1",
  "bgColor": "#18233f",
  "logoColor": "#ffffff",
  "name": "Alexis"
}
```

Le handler valide :

- `logoId` connu ;
- `paletteKey` connue ;
- `bgColor` et `logoColor` inclus dans la palette choisie ;
- `name` nettoye avec la logique existante de prenom.

Le stockage utilise le KV existant avec la cle `finalChoice`.

## Admin

L'espace admin affiche une nouvelle carte `Choix final`.

La carte montre :

- le logo choisi ;
- la palette ;
- la couleur de fond ;
- la couleur du logo ;
- le prenom de la derniere personne ayant valide, si disponible ;
- la date de derniere modification.

Si aucun choix final n'existe, la carte affiche un etat vide clair.

Cette carte est informative. La modification du choix final se fait depuis la page publique via le bouton `Modifier`.

## Relation avec le vote existant

Le vote actuel reste en place :

- palette preferee ;
- classement des logos ;
- message optionnel ;
- affichage admin des votes.

Le choix final global est un signal separe. Il ne remplace pas les votes individuels et ne modifie pas les donnees de classement deja stockees.

## Direction UI

La direction reste celle du site actuel :

- fond sombre ;
- surfaces sobres ;
- accent periwinckle existant ;
- grands apercus de logo ;
- controles compacts et lisibles.

Les recommandations `ui-ux-pro-max` utilisees via Node orientent la mise en page :

- contraste fort ;
- focus visible ;
- cibles tactiles d'au moins 44 px ;
- popup avec z-index explicite ;
- pas d'emoji comme icones ;
- transitions courtes et respect de `prefers-reduced-motion` ;
- layout responsive a 375 px, 768 px, 1024 px et desktop large.

## Tests

Les tests doivent couvrir :

- validation du payload de choix final ;
- enregistrement et remplacement du choix final global ;
- `GET /api/final-choice` avec et sans choix existant ;
- rendu public sans choix final ;
- rendu public avec choix final ;
- ouverture de la popup vierge depuis `Valider notre choix` ;
- ouverture de la popup pre-remplie depuis `Modifier` ;
- selection palette/logo/couleurs dans la popup ;
- validation et affichage de la section finale ;
- affichage admin de la carte `Choix final` ;
- navigation entre `Logo & palette` et `Iconographie` ;
- etat d'attente de l'onglet `Iconographie`.

## Hors perimetre

Cette phase ne change pas :

- les fichiers SVG existants ;
- le vote de classement actuel ;
- le panneau de vote lateral actuel ;
- le modele des analytics anonymes ;
- le contenu reel du futur onglet iconographie ;
- la creation d'un vrai vote iconographie tant que les visuels ne sont pas disponibles.
