# Ce qui reste à faire avant la mise en vente

## 1. Validation médicale des règles (bloquant)
- Faire relire `rules/hashimoto.json` par un médecin endocrinologue **et** un(e) diététicien(ne)-nutritionniste : chaque règle, chaque poids, chaque seuil, chaque liste d'ingrédients/additifs.
- Points à trancher en particulier : gluten (indication réelle vs. sur-restriction ?), soja, sel iodé, seuil « excès d'iode », huiles « raffinées » (OFF ne le précise pas), traitement des sucres, poids des bonus, double comptage soja/huile de soja.
- Documenter la source de chaque règle (références) ; renseigner `validation.status = "VALIDATED"`, `validatedBy`, `validatedOn`. Tant que ce n'est pas fait, l'app affiche « critères non relus ».
- Mettre en place un processus de révision (versionnage des règles, journal des changements).

## 2. Qualification réglementaire du produit
- Vérifier avec un juriste que l'app reste hors du périmètre « dispositif médical logiciel » (règlement UE 2017/745) : pas de finalité de diagnostic/traitement, formulations strictement bien-être. Relire tous les textes (y compris les libellés « Plutôt adapté / Peu adapté »).
- Revoir toute communication marketing / store : aucune promesse de santé.

## 3. Relecture juridique
- Politique de confidentialité, CGU, mentions légales (modèles fournis, nombreux `[À COMPLÉTER]`) ; CGV si vente ; droit de rétractation / garanties consommateur.
- Retirer le composant `<Draft />` des pages **uniquement** après relecture.
- Registre des traitements, AIPD, DPA (Vercel, Anthropic), transferts hors UE.
- Droits d'Open Food Facts (ODbL) et conditions d'usage de leur API (identification, volumétrie raisonnable ; contacter OFF si usage commercial important).

## 4. Audit de sécurité
- Audit externe / pentest : surtout `/api/label` (abus, coût, injection via image), CSP, PWA/service worker.
- Rate limiting distribué (Redis/KV), alertes de coût et d'erreurs, monitoring **sans données personnelles**.
- `npm audit`, Dependabot, SAST (CodeQL), secret scanning ; politique de divulgation (`security.txt`).
- Tests sur appareils réels (iOS Safari, Android Chrome) : caméra, CSP, installation PWA, mode hors-ligne.

## 5. Produit & qualité
- Vrai design/branding, vraies icônes (celles de `scripts/gen-icons.mjs` sont provisoires).
- Tests de bout en bout (Playwright) ; tests sur un échantillon réel de produits (comparer le score à l'avis d'un diététicien).
- Évaluer la qualité de la lecture d'étiquettes (taux d'erreur du modèle sur photos réelles, multilingue) et ajouter une confirmation utilisateur de la liste lue si nécessaire.
- Remplacer `html5-qrcode` (maintenance faible) si besoin ; ajouter l'anglais et l'arabe (+ relecture RTL).
- Dictionnaire de libellés français des tags (`tag.*` dans `fr.json`) à étendre ; fallback actuel = tag humanisé.
- Stratégie de modèle économique (la vente) : paiement via un prestataire conforme, sans casser le principe « aucune donnée de santé côté serveur » (ex. achat sans compte lié au profil).
- ESLint (+ `eslint-plugin-security`), CI (typecheck, tests, audit) à ajouter.

## 6. Ajouts v0.2 à finaliser
- Juriste : valider le parcours de consentement (refus = profil en session), le texte de la section Sentry, la mention de la recherche, et la conservation de la trace du refus sur l'appareil.
- Sentry : créer le projet UE, DPA, « Prevent Storing of IP Addresses », rétention minimale, quotas ; test de bout en bout d'un rapport réel.
- Test manuel à 150 % de taille de texte sur écran 320 px, en thème clair et sombre, avec lecteur d'écran (onboarding inclus).
- Migration vers Next 16 (correctif des vulnérabilités du `postcss` embarqué), puis retest de la CSP, du middleware et du nonce.
