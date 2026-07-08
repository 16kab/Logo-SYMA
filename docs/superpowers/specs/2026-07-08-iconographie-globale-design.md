# Selection iconographique globale

Date : 2026-07-08

## Objectif

Transformer l'onglet `Iconographie` en espace de validation commun a tous les visiteurs.

Les SVG fournis dans le dossier source de Studio SYMA sont affiches en liste. Chaque validation, refus, retour texte ou demande libre devient global et visible par toutes les personnes qui ouvrent la page.

## Portee

Cette phase couvre :

- l'import des SVG d'iconographie dans le projet public ;
- l'affichage de tous les SVG dans l'onglet `Iconographie` ;
- la validation ou le refus global de chaque SVG ;
- la saisie et la consultation d'un retour texte pour les refus ;
- l'ajout de demandes libres avec un titre, sans SVG et sans mecanique de validation ;
- le stockage global via API.

Cette phase ne couvre pas :

- un vote individuel par personne ;
- un classement des iconographies ;
- une authentification ou restriction de modification ;
- une interface admin separee pour cette selection.

## Assets

Les SVG source sont pris depuis :

`C:\Users\alexis.kabiche\OneDrive - SPVIE\Bureau\Dossiers\Perso\Studio SYMA\SVG`

Ils sont copies dans un dossier du projet, par exemple `SVG/iconographie/`, pour etre servis par le site et disponibles en production.

Les noms de fichiers avec accents, espaces ou apostrophes sont conserves si le serveur les sert correctement. Les titres affiches sont derives du nom de fichier sans extension, avec une casse lisible.

## Onglet Iconographie

L'etat d'attente actuel de l'onglet `Iconographie` est remplace par un ecran complet.

L'ecran contient :

1. un en-tete court avec le titre `Selection iconographique` ;
2. une action pour ajouter une demande libre ;
3. une grille responsive de cartes SVG ;
4. une zone de demandes libres ajoutees par les clients, si elle contient des elements.

Le panneau de vote lateral des logos reste masque quand l'onglet iconographie est actif.

## Carte SVG

Chaque SVG est affiche dans une carte.

La carte contient :

- un titre base sur le nom du fichier ;
- un carre blanc arrondi ;
- le SVG centre dans le carre ;
- le SVG recolore en `#18233f` ;
- deux boutons sous le visuel : valider et refuser.

Les boutons utilisent des icones ou des symboles accessibles avec un libelle `aria-label`.

## Etat valide

Quand une personne appuie sur le bouton de validation :

- l'etat global de ce SVG passe a `approved` ;
- l'encadre du SVG prend un etat vert ;
- le texte `Valide` apparait sous le SVG ;
- un bouton secondaire `Modifier` apparait.

Le bouton `Modifier` remet la carte en etat neutre cote interface pour permettre une nouvelle decision. La decision suivante remplace l'etat global existant.

## Etat refuse

Quand une personne appuie sur le bouton de refus :

- une popup s'ouvre ;
- la popup contient un textarea pour saisir le retour ;
- la personne peut enregistrer ou annuler.

Apres enregistrement :

- l'etat global de ce SVG passe a `rejected` ;
- l'encadre du SVG prend un etat rouge ;
- un bouton `Voir le retour` apparait ;
- un bouton secondaire `Modifier` apparait.

Le bouton `Voir le retour` rouvre la popup avec le texte existant. Depuis cette popup, le retour peut etre consulte et modifie puis reenregistre.

Le bouton `Modifier` remet la carte en etat neutre cote interface pour permettre de valider ou refuser a nouveau.

## Demandes libres

Les clients peuvent ajouter eux-memes des encadres avec un titre, sans fournir de SVG.

Une demande libre contient :

- un identifiant stable ;
- un titre nettoye ;
- une date de creation en millisecondes Unix.

Les demandes libres s'affichent comme des cartes simples avec leur titre. Elles n'ont pas de boutons de validation, de refus ou de retour. Elles servent uniquement a lister les SVG supplementaires souhaites.

Un titre vide est refuse. Les titres sont limites a une longueur raisonnable pour eviter les mises en page cassees.

## API et stockage

Une nouvelle API publique gere l'etat global :

- `GET /api/iconography` retourne les etats des SVG et les demandes libres ;
- `POST /api/iconography` applique une action globale.

Actions ciblees :

- `approve` : valide un SVG ;
- `reject` : refuse un SVG avec un retour texte ;
- `reset` : supprime l'etat d'un SVG ;
- `addRequest` : ajoute une demande libre avec un titre.

Le stockage utilise le KV existant avec une cle globale dediee, par exemple `iconography`.

Modele cible :

```json
{
  "items": {
    "blobs": {
      "status": "approved",
      "feedback": "",
      "updatedAt": 1783519200000
    },
    "bouquet": {
      "status": "rejected",
      "feedback": "A rendre plus minimal",
      "updatedAt": 1783519300000
    }
  },
  "requests": [
    {
      "id": "request-1783519400000",
      "title": "Ajouter une tasse vue de face",
      "createdAt": 1783519400000
    }
  ]
}
```

## Validation

Le handler API valide :

- l'action demandee ;
- l'identifiant SVG contre la liste connue ;
- le statut autorise ;
- le retour texte pour un refus ;
- le titre d'une demande libre.

Le texte de retour et les titres sont nettoyes :

- trim des espaces ;
- refus des chaines vides quand le champ est obligatoire ;
- limite de longueur ;
- stockage en texte brut seulement.

## Accessibilite et UX

La grille doit rester lisible sur mobile et desktop.

Contraintes UI :

- cibles tactiles d'au moins 44 px ;
- focus visible sur tous les boutons et champs ;
- etats vert/rouge accompagnes de texte, pas seulement de couleur ;
- popup avec `role="dialog"`, titre clair et fermeture accessible ;
- textarea avec label explicite ;
- pas de chevauchement de texte dans les cartes ;
- transitions courtes et respect de `prefers-reduced-motion`.

La direction visuelle reste celle du site :

- fond sombre ;
- cartes sobres ;
- surfaces SVG blanches ;
- SVG recolores en `#18233f` ;
- etats vert et rouge coherents avec les variables existantes.

## Tests

Les tests doivent couvrir :

- la liste des assets iconographie et l'existence des fichiers copies ;
- la validation API des actions `approve`, `reject`, `reset` et `addRequest` ;
- le stockage et le remplacement global des etats SVG ;
- le rejet des payloads invalides ;
- le rendu de la grille iconographie ;
- la recoloration des SVG en `#18233f` ;
- le passage en etat valide avec texte `Valide` et bouton `Modifier` ;
- le refus avec ouverture popup, saisie, sauvegarde et bouton `Voir le retour` ;
- la consultation/modification du retour existant ;
- l'ajout d'une demande libre avec titre ;
- la presence de styles responsive et accessibles dans le theme immersif.
