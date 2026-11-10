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
