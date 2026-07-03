# Analytics anonymes des visites SYMA

Date : 2026-07-03

## Objectif

Permettre a l'espace admin de voir quand des visiteurs anonymes se sont connectes au site public et combien de temps ils sont restes, avec un graphique lisible dans le tableau de bord admin.

La fonctionnalite doit rester interne au site, sans service analytics externe, et conserver toutes les donnees tant que le stockage Redis les garde.

## Portee

Le suivi concerne uniquement les visites anonymes du site public. Les connexions a l'espace admin ne sont pas incluses.

Le systeme stocke des sessions anonymes, pas des personnes identifiables. Il ne stocke pas l'adresse IP, le nom, l'email, ni le user-agent complet.

## Modele de session

Chaque session de visite contient :

- `visitId` : identifiant aleatoire genere cote navigateur et conserve dans `sessionStorage` ;
- `startedAt` : date de debut de session en millisecondes Unix ;
- `lastSeenAt` : derniere activite connue en millisecondes Unix ;
- `durationMs` : duree estimee de la session ;
- `pageViews` : nombre de chargements observes pour cette session.

Une session correspond a un onglet ou une session navigateur. Fermer puis rouvrir le navigateur cree une nouvelle session.

## Collecte cote public

Un nouveau module JavaScript est charge par `index.html`.

Au chargement, le module :

1. lit ou cree un `visitId` dans `sessionStorage` ;
2. envoie un evenement `start` a `POST /api/visit` ;
3. envoie un evenement `heartbeat` regulier tant que la page reste active ;
4. envoie un dernier signal opportuniste quand la page devient cachee ou avant de quitter, si le navigateur le permet.

La duree affichee dans l'admin est une estimation basee sur `lastSeenAt - startedAt`. Si le visiteur ferme brutalement l'onglet, la derniere activite connue est conservee.

## API publique

`POST /api/visit` accepte uniquement les evenements anonymes de visite.

Payload attendu :

```json
{
  "visitId": "session-id",
  "event": "start"
}
```

`event` peut valoir `start` ou `heartbeat`.

Le handler valide que `visitId` est une chaine non vide et que l'evenement est connu. Les donnees invalides retournent `400`.

Le stockage utilise le KV existant :

- hash `visits` pour l'etat courant de chaque session, indexe par `visitId` ;
- la conservation est illimitee, sans suppression automatique.

## API admin

Un nouveau endpoint `GET /api/visits` retourne les analytics uniquement avec le meme Bearer token admin que `GET /api/votes`.

Sans token valide, le endpoint retourne `401`.

La reponse contient :

```json
{
  "summary": {
    "totalVisits": 12,
    "averageDurationMs": 42000,
    "activeNow": 1
  },
  "daily": [
    {
      "date": "2026-07-03",
      "visits": 4,
      "averageDurationMs": 37000
    }
  ],
  "recent": [
    {
      "visitId": "session-id",
      "startedAt": 1783090800000,
      "lastSeenAt": 1783090860000,
      "durationMs": 60000,
      "pageViews": 1
    }
  ]
}
```

`activeNow` compte les sessions dont `lastSeenAt` date de moins de deux minutes au moment de la requete.

`daily` groupe toutes les visites par jour civil UTC afin que les tests soient deterministes. L'affichage admin peut formatter ces dates en francais.

`recent` contient les dernieres sessions triees de la plus recente a la plus ancienne, limitees a un nombre raisonnable pour eviter de surcharger la page.

## Interface admin

La page `admin.html` garde son ecran de connexion et son dashboard existant.

Apres authentification, `js/admin.js` charge en parallele :

- les votes via `/api/votes` ;
- les visites via `/api/visits`.

Une nouvelle carte `Visites du site` est affichee dans le dashboard, avant ou apres la synthese des votes selon ce qui s'integre le mieux au layout existant.

La carte contient :

- le nombre total de visites ;
- la duree moyenne formatee en secondes ou minutes ;
- le nombre de sessions actives recemment ;
- un graphique accessible representant les visites par jour et la duree moyenne.

Le graphique est implemente en HTML/CSS/JS natif pour rester leger. Il doit avoir des libelles textuels et une structure lisible sans canvas obligatoire.

Si aucune visite n'est enregistree, la carte affiche un etat vide clair.

## Vie privee et limites

Cette fonctionnalite ne remplace pas un outil analytics complet. Elle donne une lecture simple du trafic et de l'engagement sur ce site.

La duree est estimee. Elle peut etre sous-estimee si le navigateur bloque le dernier signal ou si l'onglet est ferme sans heartbeat final.

Aucune donnee directement nominative n'est ajoutee par cette fonctionnalite.

## Tests

Les tests doivent couvrir :

- la creation d'une session lors d'un evenement `start` ;
- la mise a jour de `lastSeenAt`, `durationMs` et `pageViews` ;
- le rejet des payloads invalides ;
- la protection admin de `GET /api/visits` ;
- les aggregats `summary`, `daily` et `recent` ;
- le rendu admin de la carte de visites, des metriques et de l'etat vide ;
- le chargement du tracker depuis la page publique.

## Hors perimetre

Cette fonctionnalite ne change pas :

- le modele de vote existant ;
- le mot de passe admin ;
- le fournisseur de stockage Redis ;
- le deploiement Vercel decrit dans `DEPLOY.md` ;
- l'ajout d'un service analytics tiers ;
- l'identification personnelle des visiteurs.
