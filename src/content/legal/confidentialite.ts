import type { LegalBlock } from "./types";

/** Politique de confidentialité. Modèle à faire relire par un juriste ; [À COMPLÉTER] = information à fournir. */
export const CONFIDENTIALITE: LegalBlock[] = [
  {
    "h": "1. Responsable de traitement",
    "p": [
      "[À COMPLÉTER : nom / raison sociale], [À COMPLÉTER : adresse], [À COMPLÉTER : e-mail de contact RGPD]. [À COMPLÉTER : DPO le cas échéant]."
    ]
  },
  {
    "h": "2. Principe : vos données restent sur votre appareil",
    "p": [
      "L'application n'a pas de compte utilisateur. Votre profil, votre historique de scans, vos favoris, votre frigo, vos recettes enregistrées, votre régime et votre suivi des symptômes sont stockés uniquement dans le navigateur de votre appareil. Ils ne sont jamais conservés sur nos serveurs. La seule exception, facultative et soumise à votre accord préalable, est la génération de recettes (voir ci-dessous) : la liste d'ingrédients que vous demandez de cuisiner et des catégories d'aliments à éviter sont alors transmises le temps du traitement."
    ]
  },
  {
    "h": "3. Données traitées et finalités",
    "ul": [
      "**Profils de santé choisis (Hashimoto, cœliaque, lupus, etc.), historique et favoris (sur l'appareil)** : données de santé (art. 9 RGPD). Base légale : votre consentement explicite (art. 9.2.a), recueilli à la première utilisation, refusable et retirable à tout moment dans Réglages. Finalité : retrouver vos scans et produits favoris. Si vous refusez, l'application fonctionne avec le profil choisi pendant la session, sans rien enregistrer. Votre choix (consentement ou refus), sa date et la version de ce texte sont mémorisés sur l'appareil pour ne pas vous le redemander à chaque ouverture ; il vous sera redemandé si ce texte change de façon substantielle.",
      "**Régime, progression et suivi des symptômes (sur l'appareil)** : niveau de rigueur du régime (strict / en cours de test / souple), compteurs d'usage, y compris leur répartition par jour pour les vues semaine, mois et année (scans effectués, recettes générées), statut des recettes enregistrées (à tester / testée / approuvée) et notes quotidiennes de ressenti (énergie, digestion, humeur, sommeil, concentration). Ce sont des données de santé (art. 9 RGPD) : même base légale, même retrait et même effacement que le profil et l'historique. Elles ne quittent jamais l'appareil : aucun envoi à nos serveurs ni à un tiers.",
      "**Préférences d'affichage** (thème clair/sombre, taille du texte, langue : français, anglais ou arabe) et **choix des rapports d'erreur** : mémorisées sur l'appareil. Ce ne sont pas des données de santé ; elles sont strictement nécessaires au confort d'utilisation que vous avez choisi.",
      "**Code-barres recherché** : transmis à notre serveur puis à Open Food Facts pour obtenir la composition du produit. Il n'est pas associé à votre identité et n'est pas conservé par nous.",
      "**Recherche par nom de produit** : le terme saisi est transmis à notre serveur (requête POST, absente des URL) puis à Open Food Facts pour obtenir des résultats. Il n'est ni enregistré, ni journalisé, ni conservé par l'application, ni stocké sur votre appareil. Open Food Facts reçoit l'adresse IP de notre serveur, pas la vôtre. [À COMPLÉTER : vérifier que les journaux de l'hébergeur n'enregistrent pas le corps des requêtes.]",
      "**Photo d'étiquette (fonction facultative)** : envoyée à notre serveur puis à Anthropic (API Claude) pour lire la liste d'ingrédients. Elle n'est ni stockée ni journalisée par l'application et est supprimée dès la fin du traitement. [À COMPLÉTER : conditions de rétention d'Anthropic, localisation du traitement hors UE et garanties de transfert (clauses contractuelles types / DPF), DPA].",
      "**Génération de recettes (fonction facultative, après accord explicite)** : si vous demandez des idées de recettes (depuis la fiche d'un produit scanné ou depuis « Mon frigo »), les noms des ingrédients concernés (15 au maximum par demande) et une liste de catégories d'aliments à éviter déduite des règles de votre profil (par exemple « sans gluten ») sont envoyés à notre serveur, puis à Anthropic (API Claude), prestataire d'IA situé hors de l'Union européenne, pour générer les recettes. **Votre profil, son nom et tout diagnostic ne sont jamais envoyés**, ni aucun identifiant. Un écran d'information et une case à cocher précèdent le premier envoi ; l'accord est retirable à tout moment dans Réglages. Nous ne conservons ni la liste, ni les recettes générées pour une demande personnelle : seuls des compteurs techniques sont journalisés (nombre de tokens, sans contenu). Pour les produits scannés, les recettes générées peuvent être mises en cache sur nos serveurs sous une clé qui ne contient que le code-barres, la version des règles, la langue et une empreinte non réversible de la liste d'exclusions (aucune donnée personnelle). Pour limiter les abus et appliquer un quota gratuit mensuel, un compteur est associé à une version pseudonymisée de votre adresse IP (empreinte salée, non réversible sans notre secret), conservée au plus environ 40 jours. Votre frigo et vos recettes enregistrées restent sur votre appareil. Base légale : votre consentement (art. 6.1.a). [À COMPLÉTER : conditions de rétention et d'entraînement d'Anthropic sur les données d'API (zero-data-retention possible ?), localisation du traitement hors UE et garanties de transfert (clauses contractuelles types / DPF), DPA ; qualification juridique de la liste d'exclusions (peut révéler indirectement un régime alimentaire) ; durée de conservation du cache et des compteurs ; fournisseur et région du magasin Redis (Upstash / Vercel KV) et DPA ; vérifier que les journaux de l'hébergeur ne contiennent pas le corps des requêtes.]",
      "**Rapports d'erreur anonymes (facultatif, désactivés par défaut)** : uniquement si vous cochez « Envoyer des rapports d'erreur anonymes » dans Réglages, les plantages de l'application sont envoyés à notre prestataire Sentry (serveurs situés dans l'UE). Le rapport contient le type d'erreur, l'emplacement dans le code de l'application et le navigateur/système d'exploitation. Il est nettoyé avant l'envoi : aucun code-barres, nom de produit, terme de recherche, profil, favori, contenu du stockage de l'appareil, URL de page ni identifiant n'y figure. Pas d'enregistrement de session, pas de suivi de performance. Base légale : votre consentement (art. 6.1.a), retirable à tout moment en décochant la case. [À COMPLÉTER : identité du prestataire (Sentry / Functional Software, Inc.), DPA, localisation réelle du traitement et de l'hébergement UE, durée de conservation configurée dans Sentry, réglage « ne pas stocker les adresses IP » activé dans le projet, qualification de la base légale par le juriste.]",
      "**Journaux techniques de l'hébergeur** (adresse IP, date) : sécurité et bon fonctionnement. [À COMPLÉTER : durée, hébergeur]."
    ]
  },
  {
    "h": "4. Ce que nous ne faisons pas",
    "p": [
      "Aucun traceur tiers, aucune publicité, aucune analyse d'audience, aucune revente de données, aucun profilage. Les seuls envois à un tiers à votre initiative sont ceux décrits ci-dessus (Open Food Facts, Anthropic pour les photos d'étiquettes et pour la génération de recettes, Sentry si vous l'activez)."
    ]
  },
  {
    "h": "5. Destinataires et transferts",
    "p": [
      "Hébergeur ([À COMPLÉTER : hébergeur, par exemple Vercel, région UE]), Open Food Facts, Anthropic (photos d'étiquettes et listes d'ingrédients pour les recettes, uniquement après votre accord), un magasin de données Redis pour les compteurs et le cache ([À COMPLÉTER : prestataire, région UE]), Sentry (rapports d'erreur, si activés). [À COMPLÉTER : transferts hors UE et garanties pour chaque destinataire.]"
    ]
  },
  {
    "h": "6. Vos droits",
    "p": [
      "Accès, rectification, effacement, limitation, portabilité, opposition, retrait du consentement. Comme les données sont locales, vous pouvez tout effacer vous-même via Réglages > « Supprimer toutes mes données » (consentement, profil, historique, favoris, frigo, recettes enregistrées, préférences, caches). Pour toute demande : [À COMPLÉTER : e-mail de contact]. Réclamation possible auprès de la CNIL (cnil.fr). [Supprimer toutes mes données](/settings#s-delete)."
    ]
  },
  {
    "h": "7. Stockage local",
    "p": [
      "Le stockage local (localStorage) et le cache du service worker sont strictement nécessaires au fonctionnement de l'application installée ; ils ne servent pas au suivi."
    ]
  },
  {
    "h": "8. Mise à jour",
    "p": [
      "Version des textes : {{LEGAL_VERSION}}. Toute modification substantielle donnera lieu à une nouvelle demande de consentement."
    ]
  }
];
