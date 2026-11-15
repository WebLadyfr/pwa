# Checklist sécurité & conformité (à valider avant lancement)

Légende : ✅ fait dans le code (vérifié pendant le développement) · ☐ à faire / à vérifier par un humain

## Secrets
- ✅ Aucune clé dans le code ni le bundle navigateur (grep de `.next/static` : rien) ; `server-only` sur le module Claude.
- ✅ `.env*` dans `.gitignore`, `.env.example` sans valeur.
- ☐ Clé Anthropic créée avec un **plafond de dépense** et dédiée à ce projet ; rotation planifiée.
- ☐ Secret scanning activé sur le repo (GitHub) ; vérifier `git log` : aucun secret historique.
- ✅ Logs : le code ne journalise ni images, ni IP, ni clé, ni corps de requête.
- ☐ Vérifier les logs Vercel (retention, pas de body logging) et désactiver tout log d'IP non nécessaire.

## Backend / API (OWASP A01, A03, A04, A05, A10)
- ✅ `/api/label` : même origine obligatoire, type + taille validés **avant** lecture, lecture bornée, vérification des magic bytes = type déclaré, rate limit, plafond quotidien, timeout 25 s, erreurs génériques.
- ✅ Image jamais écrite sur disque ni mise en cache (`no-store`), référence libérée après usage.
- ✅ Prompt injection : le texte de l'image est déclaré « donnée », la sortie est validée strictement (regex de tags, pas de HTML).
- ✅ `/api/product` : GTIN validé (format + chiffre de contrôle) avant tout appel sortant (pas de SSRF : hôte OFF fixe).
- ☐ Remplacer le rate limit mémoire par Redis/KV partagé.
- ☐ Test de charge / abus sur `/api/label` ; alerte de coût Anthropic.

## Front (OWASP A03, A05, A08)
- ✅ Aucun `dangerouslySetInnerHTML` (à contrôler : `grep -r dangerouslySetInnerHTML src`).
- ✅ Données OFF/IA assainies côté serveur **et** revalidées côté client ; URLs d'images limitées aux hôtes OFF en HTTPS.
- ✅ Données locales revalidées à la lecture (stockage modifiable par l'utilisateur).
- ✅ CSP à nonce, `object-src 'none'`, `frame-ancestors 'none'`, `connect-src 'self'`.
- ✅ HSTS, `nosniff`, Referrer-Policy, Permissions-Policy (caméra `self` seulement), COOP/CORP, X-Frame-Options.
- ☐ Contrôler en navigateur réel que la CSP ne bloque rien (console) : scan caméra sur Android + iOS.
- ☐ Scan https://securityheaders.com et Mozilla Observatory sur l'URL de production.

## Dépendances (A06)
- ✅ 4 dépendances de prod seulement : `next`, `react`, `react-dom`, `html5-qrcode` (+ `server-only`).
- ⚠️ **`npm audit --omit=dev` (9 nov. 2026) : 2 vulnérabilités (1 haute, 1 modérée)**, toutes via le `postcss` embarqué par Next 15 (advisories sur `sourceMappingURL` / `</style>` : concernent le traitement de CSS contrôlé par un attaquant, or ici seul notre CSS est compilé, au build). Correctif disponible uniquement avec Next 16 (changement majeur) : **à planifier** (migration Next 16 + retest CSP/middleware) avant lancement.
- ☐ `npm run audit:prod` propre avant chaque release ; Dependabot activé.
- ☐ `html5-qrcode` est peu maintenu : surveiller, ou migrer vers `BarcodeDetector` natif / `zxing-wasm`.

## RGPD / données de santé
- ✅ Profil et historique **uniquement sur l'appareil** ; rien sur un serveur.
- ✅ Aucune écriture (profil/historique) avant consentement explicite ; boutons Accepter / Refuser de même poids ; refus = app utilisable.
- ✅ Retrait du consentement = effacement du profil et de l'historique ; horodatage + version de politique enregistrés.
- ✅ « Supprimer toutes mes données » : localStorage, caches et service worker.
- ✅ Photos jamais conservées ; EXIF supprimé côté client.
- ✅ Aucun tracker, publicité ni analytics.
- ☐ Registre des traitements (art. 30) et **AIPD/DPIA** (données de santé : fortement recommandée, probablement obligatoire selon l'échelle).
- ☐ **Anthropic** : DPA signé, conditions de rétention (zero-data-retention possible ?), transferts hors UE (CCT / DPF) documentés dans la politique de confidentialité.
- ☐ Vérifier le texte de consentement par un juriste (granularité, preuve, information sur le retrait).
- ☐ Hébergeur : DPA, région UE, durée de conservation des logs d'accès.

## Mentions obligatoires
- ✅ Disclaimer exact dans le pied de page de toutes les pages, `offline.html`, CGU, mentions légales.
- ✅ Attribution « Données : Open Food Facts (licence ODbL) » avec lien.
- ✅ Aucun terme de guérison / formulation médicale (relecture humaine à faire : mots comme « adapté » restent à valider).
- ☐ ODbL : vérifier les obligations de partage à l'identique si vous redistribuez une base dérivée (l'historique local n'en est pas une, mais à confirmer).

## Espace « Informations légales » (15 nov. 2026)
- ✅ Cinq pages dédiées : `/legal/mentions`, `/legal/cgu`, `/legal/confidentialite`, `/legal/avertissement`, `/legal/licences` (contenu dans `src/content/legal/*.ts`, date de mise à jour et bandeau « à faire relire » en tête). Index : `/legal`. Anciennes adresses `/privacy` et `/terms` : redirigées.
- ✅ Accès : Réglages > « À propos et informations légales » (5 pages + Contact + version de l'app) et pied de page de chaque écran.
- ✅ Aucun lien externe dans les textes (tests) ; seul le lien `mailto:` du Contact sort de l'app.
- ✅ Rappel court du disclaimer sous le score (avec « En savoir plus ») ; liens CGU et confidentialité dans la phrase de consentement.
- ✅ Source unique du disclaimer : clés i18n `disclaimer` / `disclaimer.short`. Source unique de la version des textes : `LEGAL_VERSION` (= `POLICY_VERSION`) : la changer redemande le consentement à tous.
- ✅ Pages légales mises en cache par le service worker dès l'installation (lisibles hors ligne).
- ☐ **Remplir tous les `[À COMPLÉTER]`** des cinq fichiers de `src/content/legal/` (éditeur, SIRET, adresse, hébergeur, DPO, DPA Anthropic / Sentry, durées de rétention, droit applicable) puis faire relire par un juriste et retirer le bandeau `Draft`.
- ☐ Renseigner `NEXT_PUBLIC_CONTACT_EMAIL` (sinon l'entrée « Contact » renvoie vers les mentions légales).
- ☐ Générer la liste complète des licences des dépendances (directes et indirectes) avant lancement.
- ☐ Quand les textes changent de façon substantielle : mettre à jour `LEGAL_VERSION` et `LEGAL_UPDATED` (`src/content/legal/version.ts`).
- ⚠️ `npm audit --omit=dev` (15 nov. 2026) : toujours les 2 mêmes vulnérabilités (postcss embarqué par Next 15), aucune nouvelle.
- ⚠️ Les pages légales sont prérendues par route mais servies dynamiquement : la CSP à nonce impose de lire les en-têtes dans le layout racine.

## Accessibilité (RGAA / WCAG 2.2 AA)
- ✅ Couleur + icône + texte pour chaque niveau ; contrastes calculés ≥ 4.5:1 ; cibles ≥ 48 px ; focus visible ; `prefers-reduced-motion`.
- ☐ Audit manuel : lecteur d'écran (TalkBack/VoiceOver), zoom 200 %, test daltonisme.
- ☐ Déclaration d'accessibilité si l'activité y est soumise.

---

# Ajouts v0.2 (onboarding, recherche, favoris, thème, Sentry)

## Onboarding et consentement (art. 9 RGPD)
- ✅ Disclaimer à cocher AVANT d'accéder à l'app ; consentement avec « J'accepte » / « Je refuse » de même poids ; le refus n'empêche pas d'utiliser l'app.
- ✅ Refus : seules la trace du refus et celle du disclaimer sont écrites (testé : `consent.test.ts`) ; profil gardé en mémoire (session) uniquement.
- ✅ Versions des textes enregistrées (`POLICY_VERSION`, `DISCLAIMER_VERSION`) : si elles changent, le parcours est redemandé et rien n'est lu ni écrit entre-temps (testé).
- ☐ **À chaque modification de la politique de confidentialité ou du texte de consentement : incrémenter `POLICY_VERSION`** (`src/lib/storage.ts`). Un oubli = un consentement périmé considéré comme valide. Idéalement : règle de revue de code.
- ☐ Faire valider par un juriste que la trace du refus (non sensible) stockée sur l'appareil est acceptable sans bandeau supplémentaire.
- ☐ Faire valider que « refus = profil en session » respecte la liberté du consentement (ici, seuls l'historique et les favoris sont indisponibles en cas de refus).

## Recherche par nom
- ✅ Entrée validée côté serveur (type, 2 à 60 caractères, liste blanche Unicode, opérateurs de requête neutralisés). Constaté : l'API d'Open Food Facts accepte une syntaxe de requête (`code:*` passe), d'où la liste blanche.
- ✅ POST (terme absent des URL, donc des journaux d'accès), aucun `console.log`, pas de cache, terme jamais stocké côté client (ni URL, ni localStorage). Vérifié : 0 occurrence du terme dans les logs du serveur.
- ✅ Rate limit (20/min/IP, `SEARCH_RATE_LIMIT_PER_MIN`), same-origin, taille de corps limitée, erreurs génériques ; chaque produit est revalidé côté serveur ET côté client.
- ☐ Vérifier chez l'hébergeur (Vercel) que les journaux ne contiennent ni les corps de requête ni les IP au-delà du nécessaire.
- ☐ Open Food Facts reçoit le terme (avec l'IP de notre serveur) : mentionné dans la politique (à valider) ; vérifier leurs conditions d'usage de l'API de recherche (volumétrie).

## Favoris
- ✅ Stockés localement, uniquement avec consentement (donnée de santé indirecte) ; relus avec revalidation complète (le stockage est modifiable par l'utilisateur) ; inclus dans « Supprimer toutes mes données » et effacés au retrait du consentement (testé).
- ✅ Score recalculé à l'ouverture avec les règles actuelles ; la date affichée est celle du dernier calcul dont le résultat a changé (testé).
- ☐ Limites : 200 favoris maximum ; l'instantané du produit peut être périmé tant que la fiche n'est pas rouverte en ligne (il est rafraîchi à chaque ouverture de la fiche).

## Thème et taille de texte
- ✅ Pas de flash : script **externe** `theme-init.js` avec nonce (aucun script inline, CSP inchangée pour les scripts) ; le mode automatique est géré en CSS pur.
- ✅ Contrastes WCAG AA vérifiés **automatiquement** dans les deux thèmes (26 paires par thème, `theme.test.ts` lit le vrai CSS) : texte ≥ 4,5:1, éléments d'interface ≥ 3:1.
- ✅ 4 tailles en pourcentage de la taille du navigateur (tout le design en `rem`) ; navigation en 3 colonnes pour rester lisible en « très grand ».
- ✅ Score : icône + texte + couleur (jamais la couleur seule).
- ☐ Test visuel manuel à 150 % et avec zoom navigateur 200 % sur petit écran (320 px) : non automatisé.
- ☐ Test daltonisme et lecteur d'écran sur le parcours d'onboarding (le focus est déplacé sur le titre à chaque écran).

## Rapports d'erreur (Sentry UE)
- ✅ Désactivé par défaut ; opt-in explicite ; le SDK n'est même pas téléchargé tant que la case n'est pas cochée ; désactivable à tout moment.
- ✅ Seul `@sentry/browser` (pas `@sentry/nextjs`) : aucune collecte côté serveur, aucune intégration par défaut (pas de breadcrumbs, de contexte HTTP ni de sessions), pas de replay, pas de tracing.
- ✅ `beforeSend` en **liste blanche** (`sentry-scrub.ts`), testé avec un événement piégé : aucun code-barres, nom de produit, terme de recherche, profil, favori, contenu de stockage, IP ni URL de page. Un champ inconnu ajouté par une future version du SDK est exclu par défaut.
- ✅ DSN accepté uniquement en région UE (`*.ingest.de.sentry.io`) ; la CSP `connect-src` reçoit **uniquement l'hôte exact** du DSN (vérifié avec un DSN factice).
- ⚠️ **Limite connue** : les messages d'erreur sont nettoyés (URLs et fin de message après une URL, textes entre guillemets, suites de ≥ 6 chiffres supprimés) mais un nom de produit écrit « nu » dans un message d'erreur ne peut pas être détecté. Règle de code : ne jamais mettre de données produit dans un message d'erreur.
- ☐ Dans le projet Sentry : activer « **Prevent Storing of IP Addresses** », rétention minimale, accès restreints, projet créé en **région UE** (le DSN `*.de.sentry.io` le garantit pour l'ingestion ; vérifier le stockage), DPA signé.
- ☐ Le DSN est fixé **au build** (`NEXT_PUBLIC_SENTRY_DSN`) et visible dans le code client : normal (non secret), mais définir un quota/filtre côté Sentry contre le spam d'événements.
- ☐ Test réel : provoquer une erreur avec la case cochée, inspecter l'événement reçu dans Sentry ET l'onglet Réseau (rien d'autre que l'hôte UE).
- ☐ Aucune supervision côté serveur (volontaire) : prévoir l'observabilité des routes API sans données personnelles.

## Dépendances (mise à jour)
- ⚠️ Ajout de `@sentry/browser` (11.11) : **aucune nouvelle vulnérabilité** selon `npm audit --omit=dev`. Les 2 mêmes (via le `postcss` embarqué par Next 15, voir plus haut) subsistent.
- ☐ Le DSN Sentry est la seule variable `NEXT_PUBLIC_*` : vérifier qu'aucun secret n'est jamais préfixé ainsi.

---

# Ajouts v0.3 (recettes générées par IA : scan → recettes, Mon frigo)

Légende inchangée : ✅ fait et vérifié dans le code/les tests · ☐ à faire ou à vérifier par un humain · ⚠️ limite connue

## Secrets et API
- ✅ Appel à l'API Claude **uniquement** depuis `/api/recipes` (module `server-only`) ; grep de `.next/static` après build : aucune occurrence de `sk-ant`, `ANTHROPIC_API_KEY`, `api.anthropic.com`, `UPSTASH`, `RECIPES_IP_SALT`.
- ✅ Corps de la requête vers Claude vérifié par test (payload réel capturé) : uniquement `model`, `max_tokens`, `thinking`, `output_config`, `system`, `messages`. Pas de `metadata.user_id`, aucun identifiant, aucun profil ni diagnostic. La clé n'est que dans l'en-tête.
- ✅ Schéma de la requête **strict** (zod) : un champ `profile`, `diagnosis`, `userId`… est refusé en 400, y compris dans `exclusions`.
- ☐ Nouvelle variable secrète `RECIPES_IP_SALT` (≥ 16 caractères aléatoires) et jetons Redis : à créer dans Vercel (*Sensitive*), jamais préfixés `NEXT_PUBLIC_`.
- ☐ Clé Anthropic : plafond de dépense + alerte de coût (le garde-fou applicatif `RECIPES_DAILY_BUDGET` ne remplace pas celui du fournisseur).

## Données de santé et vie privée
- ✅ **Ce qui sort de l'appareil** : noms d'ingrédients (≤ 15), liste d'exclusions générique (ids de règle + tags d'ingrédients), langue, version des règles, code-barres (mode scan). **Jamais** le nom du profil ni le diagnostic (testé : requête client ET requête vers Claude).
- ✅ Frigo, recettes enregistrées, quota local, accord IA : uniquement sur l'appareil, sous le préfixe `hs:v1:` → effacés par « Supprimer toutes mes données » (testé) ; le retrait de l'accord local efface frigo et recettes enregistrées (testé).
- ✅ Écran de transparence + case à cocher **avant** le premier envoi (aucun appel réseau sans accord) ; accord retirable dans Réglages ; versionné (`RECIPES_CONSENT_VERSION`).
- ✅ `POLICY_VERSION` incrémentée (`2026-11-draft-3`) : politique modifiée (nouveau destinataire hors UE) → l'onboarding est redemandé à tous.
- ✅ Journal serveur : un seul événement par requête, uniquement des compteurs (tokens, nombre d'appels, issue). Vérifié par test : ni ingrédient, ni titre, ni IP, ni clé de cache.
- ✅ IP : jamais stockée en clair ; HMAC-SHA256 salé (tronqué), durée de vie ≤ ~40 jours (compteur mensuel), 20 minutes (fenêtre de débit).
- ⚠️ **La liste d'exclusions peut révéler indirectement un régime alimentaire** (ex. « sans gluten, sans soja, sans sucres ajoutés, sans algues »). Ce n'est pas le diagnostic, mais un juriste doit trancher si elle relève des données de santé (art. 9) et si l'accord actuel (art. 6.1.a) suffit.
- ☐ Anthropic : DPA, **conditions de rétention / non-entraînement sur les données d'API**, ZDR possible ?, transferts hors UE (CCT / DPF) → à compléter dans la politique (`[À COMPLÉTER]` posés).
- ☐ Magasin Redis (Upstash / Vercel KV) : choisir une **région UE**, DPA, chiffrement, durée de conservation ; le renseigner dans la politique.
- ☐ Registre des traitements et AIPD : ajouter ce traitement.
- ☐ Journaux de l'hébergeur : confirmer qu'ils ne contiennent pas le corps des requêtes `POST /api/recipes`.

## Injection de prompt et sortie du modèle
- ✅ Noms d'ingrédients (OFF ou saisie) : liste blanche de caractères, ≤ 50 caractères / 8 mots, rejet des formulations de consigne, transmis comme **données JSON délimitées** (`<donnees_ingredients>`), le prompt système ordonne de les traiter comme des données. Testé avec 8 charges d'injection ; les chevrons et guillemets ne peuvent pas fermer le bloc.
- ⚠️ Le filtre « formulations de consigne » est une heuristique (couche parmi d'autres) : une consigne reformulée peut passer. La garantie ne repose pas sur lui mais sur la **revalidation** ci-dessous.
- ✅ Le nom du produit scanné est retrouvé **par le serveur** à partir du code-barres : le client ne peut pas empoisonner le cache partagé avec un nom arbitraire.
- ✅ Sortie validée par zod (types, bornes) puis assainie ; réponse invalide → **une seule** nouvelle tentative ; échec → message générique.
- ✅ **Revalidation par le moteur de règles** (`evaluate()` inchangé, jeu de règles synthétique issu des exclusions) sur chaque ingrédient **et** sur le titre, les étapes, l'astuce ; une recette fautive n'est jamais affichée. Refaite **sur l'appareil** (un serveur compromis ne peut pas faire afficher une recette interdite : testé). Revalidation aussi à la sortie du cache serveur.
- ✅ Filtre d'allégations de santé (`src/lib/recipes/config/health-claims.json`) appliqué à tout le texte. Observé en réel : la revalidation a rejeté au moins une recette sur les 24 générées pendant les mesures.
- ⚠️ **Couverture du lexique** (`lexicon.ts`) : un aliment absent du lexique n'est pas reconnu comme exclu ; principe « en cas de doute on rejette » (farine = blé, huile végétale = tournesol, produits sucrés courants), mais aucune liste n'est exhaustive. À faire relire par un diététicien et à enrichir avec des cas réels.
- ☐ Faire relire la liste d'allégations de santé par un juriste (et l'enrichir : elle est volontairement prudente mais non exhaustive).
- ☐ Test manuel adversarial : saisir dans « Mon frigo » des noms piégés et vérifier qu'aucune recette interdite ne s'affiche.

## Coûts et abus
- ✅ `max_tokens` plafonné (défaut 2500, plafond dur 4000) ; prompt système court et statique (cache fournisseur vérifié en réel : 577 tokens lus en cache par appel) ; **réflexion du modèle désactivée** (sinon elle consommait `max_tokens` et coupait le JSON : constaté en réel, 4 réponses sur 5).
- ✅ Rate limit **distribué** (Redis), par IP hachée : 6 requêtes / 10 min (`RECIPES_RATE_LIMIT_PER_10MIN`) ; quota gratuit mensuel configurable (défaut 10) avec compteur local + contrôle serveur ; plafond global quotidien (`RECIPES_DAILY_BUDGET`).
- ✅ **Échec fermé** : si Redis est injoignable, la route répond « indisponible » sans appeler le modèle ; en production sans Redis ni sel d'IP, la fonction est désactivée (testé).
- ✅ Cache serveur du mode scan (code-barres + version des règles + langue + empreinte des exclusions + version du prompt), TTL configurable, sans donnée personnelle ; les « cache hits » ne consomment ni quota ni tokens.
- ✅ Les générations qui échouent ou ne livrent rien ne consomment pas le quota.
- ✅ Mode dégradé : quota, limite de débit, indisponibilité, hors ligne, produit introuvable → messages clairs, jamais d'erreur technique.
- ⚠️ Rate limit et quota **par IP** : des utilisatrices derrière une même IP (réseau mobile partagé) se partagent le quota ; une personne peut le contourner en changeant d'IP. Le plafond global quotidien et le plafond de dépense du fournisseur limitent l'exposition. Le paiement (étape suivante) devra porter un droit sans lien avec le profil.
- ⚠️ Fenêtre fixe de 10 minutes (pas glissante) : une rafale à cheval sur deux fenêtres peut doubler brièvement la limite.
- ☐ Les autres routes (`/api/label`, `/api/product`, `/api/search`) gardent le rate limit **en mémoire** : brancher le même magasin Redis avant lancement.
- ☐ Test de charge / abus sur `/api/recipes` ; alerte de coût Anthropic.

## Accessibilité
- ✅ Boutons ≥ 48 px, `aria-pressed` / `aria-label` sur les cœurs, `role="status"` / `role="alert"` pour chargement et erreurs, focus déplacé sur le résultat, cases à cocher libellées, couleurs via jetons (clair/sombre), icône + texte (jamais la couleur seule). Disclaimer visible sur chaque carte.
- ☐ Audit manuel : lecteur d'écran sur le parcours frigo → génération → favori ; 150 % de texte à 320 px, thème sombre.

## Dépendances
- ✅ `zod` 4.6.7 ajouté (seule nouvelle dépendance de production). `npm audit --omit=dev` : **2 vulnérabilités (1 modérée, 1 haute), identiques à avant l'ajout** (postcss embarqué par Next 15, voir plus haut) : aucune nouveauté.
