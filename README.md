# Scan Hashimoto (MVP)

PWA mobile-first : on scanne un code-barres, l'app affiche un score 🟢🟠🔴 et les raisons précises.
**Information bien-être indicative. Ne remplace pas l'avis d'un professionnel de santé. Ne constitue ni un diagnostic ni un traitement.**

## Architecture

```
rules/
  hashimoto.json          Règles du profil (commentées, à faire valider médicalement)
  index.ts                Registre des profils (ajouter AIP, cœliaque... ici)
src/
  middleware.ts           CSP stricte à nonce (par requête)
  i18n/                   Messages (fr) + t() ; prêt pour en / ar (RTL géré)
  lib/
    score/                Moteur PUR : types, engine, validate (+ tests)
    sanitize.ts           Assainissement de TOUTE donnée externe (OFF, IA)
    barcode.ts            Validation GTIN (chiffre de contrôle)
    storage.ts            Stockage local + consentement versionné + favoris + suppression totale
    favorites.ts          Logique pure des favoris (recalcul des scores)
    prefs.ts              Thème, taille de texte, opt-in rapports d'erreur
    search-input.ts       Validation stricte du terme de recherche
    sentry-scrub.ts       Nettoyage (liste blanche) des rapports d'erreur ; monitoring.ts = init opt-in
    client.ts             Appels vers NOTRE backend, redimensionnement photo sans EXIF
    server/               off.ts, label.ts (Claude), rate-limit.ts, http.ts  [server-only]
  app/
    page.tsx              Scan caméra + saisie manuelle
    onboarding/           Refaire l'accueil (3 écrans : bienvenue, profil, disclaimer + consentement)
    search/               Recherche par nom (saisie différée, mini-scores, favoris)
    favorites/            Favoris, score recalculé à l'ouverture
    product/[code]        Résultat (score, raisons, alternative)
    label/                Photo d'étiquette -> OCR/normalisation -> même moteur
    history/ settings/    Historique local, consentement, suppression
    privacy/ terms/ legal Modèles juridiques (À FAIRE RELIRE)
    api/product/[code]    Proxy Open Food Facts (User-Agent perso, cache)
    api/alternatives/[code]  Meilleure alternative de la même catégorie
    api/search            Recherche par nom (POST, terme jamais journalisé)
    api/label             SEUL point d'accès à l'API Claude
public/sw.js, offline.html, icons/   PWA
```

### Choix importants
- **Moteur pur + règles en JSON** : le moteur ne contient aucune règle ; `validateRuleSet` fait échouer le démarrage si le JSON est mal formé (édité par un non-développeur).
- **Tags normalisés OFF (`en:wheat`)** : matching indépendant de la langue ; testé avec étiquettes FR/AR.
- **OFF appelé depuis le serveur** : un navigateur ne peut pas définir le `User-Agent` exigé par OFF ; cela évite aussi de transmettre l'IP de l'utilisateur et permet `connect-src 'self'`.
- **OCR par Claude vision en un seul appel** (lecture + normalisation en tags OFF) : pas de lib OCR à embarquer, donc moins de dépendances. La sortie du modèle est traitée comme non fiable (validation stricte des tags).
- **Photo ré-encodée côté client** (canvas) : taille réduite et métadonnées EXIF/GPS supprimées avant envoi.
- **Pas de SDK Anthropic** : un `fetch` suffit côté serveur, une dépendance de moins à auditer.
- **Rate limiting en mémoire** : « best effort » sur serverless (voir « Limites connues »).

## Installation

Prérequis : Node 20+.

```bash
npm install
cp .env.example .env.local     # puis renseigner les valeurs (jamais dans le repo)
npm run icons                  # (re)génère des icônes provisoires
npm run dev                    # http://localhost:3000
npm test                       # tests unitaires
npm run typecheck
npm run build && npm start
```

> La caméra exige HTTPS ou `localhost`. Pour tester sur téléphone : déployer sur Vercel (preview) ou utiliser un tunnel HTTPS.
> Le service worker n'est enregistré qu'en production (`npm run build && npm start`).
> N'installez pas TypeScript 7 : Next 15 requiert TypeScript 5 ou 6 (déjà épinglé en `^5`).

## Variables d'environnement

Voir `.env.example`. **Aucun secret n'est préfixé `NEXT_PUBLIC_`.** Seule exception : le DSN Sentry, qui n'est pas un secret (il ne permet qu'envoyer des événements) et n'est accepté que s'il est en région UE.

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | Clé API Claude (serveur uniquement, route `/api/label`) |
| `ANTHROPIC_MODEL` | Modèle vision utilisé |
| `OFF_USER_AGENT` | User-Agent envoyé à Open Food Facts (nom d'app + contact) |
| `LABEL_RATE_LIMIT_PER_10MIN`, `PRODUCT_RATE_LIMIT_PER_MIN` | Rate limits par IP |
| `LABEL_DAILY_BUDGET` | Plafond quotidien d'appels Claude (garde-fou de coût) |
| `SEARCH_RATE_LIMIT_PER_MIN` | Rate limit de la recherche par nom (par IP) |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN Sentry **région UE** (optionnel). Non secret mais fixé au build ; vide = rapports d'erreur indisponibles |

Sans `ANTHROPIC_API_KEY`, seule la fonction « photo d'étiquette » est indisponible (erreur générique).

## Déploiement Vercel (région UE)

1. Importer le repo dans Vercel. `vercel.json` fixe les fonctions en **`cdg1` (Paris)**.
2. *Settings → Environment Variables* : saisir les variables ci-dessus (Production + Preview, marquer la clé comme *Sensitive*).
3. Déployer ; vérifier que le domaine est en HTTPS (automatique).
4. Vérifier : https://securityheaders.com et https://observatory.mozilla.org (cible A/A+).
5. Avant HSTS `preload` : ne soumettre à hstspreload.org qu'avec le domaine définitif.

## Quand changer `POLICY_VERSION`

À **chaque** modification de la politique de confidentialité ou du texte de consentement, incrémenter `POLICY_VERSION` dans `src/lib/storage.ts` : tous les utilisateurs repassent par l'onboarding et rien n'est lu ni écrit tant qu'ils n'ont pas reconfirmé. Idem pour `DISCLAIMER_VERSION` si le disclaimer change.

## Ajouter un profil ou une langue

- **Profil** : copier `rules/hashimoto.json` → `rules/aip.json`, adapter, l'ajouter dans `rules/index.ts`. Ajouter les `reasonKey` dans les messages.
- **Langue** : créer `src/i18n/messages/en.json` (mêmes clés), l'ajouter à `catalogs` et `locales` dans `src/i18n/index.ts`. Pour l'arabe, `dir="rtl"` est déjà géré dans `layout.tsx` via `RTL_LOCALES`.

## Limites connues (MVP)

- **Rate limiting par instance** : sur serverless, chaque instance a sa mémoire. Pour la prod : Upstash Redis / Vercel KV avec la même interface (`rate-limit.ts`).
- **Alternatives** : dépend de l'endpoint de recherche d'Open Food Facts, qui est parfois indisponible (constaté pendant le développement) ; l'app affiche alors simplement « pas d'alternative ».
- **Qualité des données OFF** : listes d'ingrédients parfois partielles → « données insuffisantes » plutôt qu'un score trompeur.
- **CSP `style-src 'unsafe-inline'`** : seul compromis (styles React/Next) ; les scripts restent stricts (nonce + strict-dynamic).
- Les règles sont un **brouillon non validé** (`validation.status: "DRAFT"`) : l'app l'indique à l'utilisateur.
- **Sentry** : seules les erreurs côté navigateur sont collectées (pas de SDK serveur). Les messages sont nettoyés, mais un nom de produit « nu » dans un message ne serait pas détectable : ne jamais mettre de données produit dans un message d'erreur.
- **Recherche par nom** : dépend de search.openfoodfacts.org (service tiers, parfois lent ou indisponible : l'app affiche alors un message clair).
- Lint ESLint non configuré (volontairement minimal) ; à ajouter avec `eslint-plugin-security` avant lancement.

Voir aussi : [docs/SECURITY_COMPLIANCE_CHECKLIST.md](docs/SECURITY_COMPLIANCE_CHECKLIST.md) et [docs/BEFORE_LAUNCH.md](docs/BEFORE_LAUNCH.md).
