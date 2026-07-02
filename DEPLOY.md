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

## 3. Ajouter le stockage (Redis)

1. Dans le projet Vercel, onglet **Storage** → choisir une option **Redis** (marketplace) → suivre le flux de création.
2. Une fois connectée, l'intégration ajoute automatiquement la variable d'environnement `REDIS_URL` (chaîne de connexion complète) à tous les environnements (Production/Preview/Development).

## 4. Définir le mot de passe admin

1. Dans le projet Vercel, **Settings → Environment Variables**.
2. Ajouter `ADMIN_PASSWORD` avec la valeur de votre choix, pour les environnements Production et Preview.
3. Redéployer (Settings → Deployments → "Redeploy") pour que la variable soit prise en compte.

## 5. Vérifier

- Ouvrir l'URL de production : le comparateur et les votes doivent fonctionner (stockés dans Redis).
- Ouvrir `/admin.html`, se connecter avec `ADMIN_PASSWORD`, vérifier que les votes et messages remontent.

## Développement local

```bash
npm install
npm run dev
```

Ouvre `http://localhost:3000`. Le serveur de développement utilise un stockage en mémoire (réinitialisé à chaque redémarrage) — aucune connexion à Redis n'est nécessaire en local. Pour tester la page admin en local, définir un mot de passe avant de lancer le serveur :

```bash
# PowerShell
$env:ADMIN_PASSWORD = "test1234"
npm run dev
```

## Lancer les tests

```bash
npm test
```
