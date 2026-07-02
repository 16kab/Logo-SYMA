# Déploiement sur Vercel

## 1. Créer le repo GitHub

1. Créer un nouveau repo sur GitHub (vide, sans README).
2. Depuis ce dossier :
   ```bash
   git remote add origin <url-du-repo>
   git branch -M main
   git push -u origin main
   ```

## 2. Importer le projet dans Vercel

1. Sur vercel.com, "Add New Project" → sélectionner le repo GitHub.
2. Aucune configuration de build nécessaire (site statique + fonctions serverless détectées automatiquement).
3. Cliquer sur "Deploy".

## 3. Ajouter le stockage (Upstash Redis)

Vercel KV est déprécié — le stockage passe désormais par Upstash Redis. Upstash a un vrai plan gratuit (500 000 commandes/mois, sans carte bancaire), mais le flux d'intégration **Marketplace** de Vercel demande parfois une méthode de paiement même pour l'activer (juste pour autoriser une éventuelle facturation si tu dépasses le gratuit). Pour l'éviter, crée la base directement sur Upstash et relie-la manuellement :

1. Créer un compte sur [upstash.com](https://upstash.com) (gratuit, sans carte requise) et créer une base **Redis**.
2. Dans le dashboard Upstash, ouvrir la base → onglet **Details** → section **REST API** → copier les deux valeurs `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`.
3. Dans le projet Vercel, **Settings → Environment Variables**, ajouter ces deux variables avec les valeurs copiées, pour les environnements Production et Preview.

(Si tu préfères passer par le Marketplace Vercel — Storage → Marketplace Database Integrations → Upstash — ça fonctionne aussi et ajoute les mêmes variables automatiquement, mais peut demander une carte selon l'état actuel du flux Vercel.)

## 4. Définir le mot de passe admin

1. Dans le projet Vercel, **Settings → Environment Variables**.
2. Ajouter `ADMIN_PASSWORD` avec la valeur de votre choix, pour les environnements Production et Preview.
3. Redéployer (Settings → Deployments → "Redeploy") pour que la variable soit prise en compte.

## 5. Vérifier

- Ouvrir l'URL de production : le comparateur et les votes doivent fonctionner (stockés dans Upstash Redis).
- Ouvrir `/admin.html`, se connecter avec `ADMIN_PASSWORD`, vérifier que les votes et messages remontent.

## Développement local

```bash
npm install
npm run dev
```

Ouvre `http://localhost:3000`. Le serveur de développement utilise un stockage en mémoire (réinitialisé à chaque redémarrage) — aucune connexion à Upstash Redis n'est nécessaire en local. Pour tester la page admin en local, définir un mot de passe avant de lancer le serveur :

```bash
# PowerShell
$env:ADMIN_PASSWORD = "test1234"
npm run dev
```

## Lancer les tests

```bash
npm test
```
