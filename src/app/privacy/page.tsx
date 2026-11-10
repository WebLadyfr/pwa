import { Draft } from "@/components/Draft";

export const metadata = { title: "Politique de confidentialité" };

export default function Privacy() {
  return (
    <article className="space-y-4 leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-inside [&_ul]:list-disc">
      <h1 className="text-xl font-semibold">Politique de confidentialité</h1>
      <Draft />

      <h2>1. Responsable de traitement</h2>
      <p>[NOM / RAISON SOCIALE], [ADRESSE], [E-MAIL DE CONTACT RGPD]. [DPO le cas échéant].</p>

      <h2>2. Principe : vos données restent sur votre appareil</h2>
      <p>L'application n'a pas de compte utilisateur. Votre profil, votre historique de scans et vos favoris sont stockés uniquement dans le navigateur de votre appareil. Ils ne sont jamais envoyés à nos serveurs.</p>

      <h2>3. Données traitées et finalités</h2>
      <ul>
        <li><strong>Profil « Hashimoto », historique et favoris (sur l'appareil)</strong> : données de santé (art. 9 RGPD). Base légale : votre consentement explicite (art. 9.2.a), recueilli à la première utilisation, refusable et retirable à tout moment dans Réglages. Finalité : retrouver vos scans et produits favoris. Si vous refusez, l'application fonctionne avec le profil choisi pendant la session, sans rien enregistrer. Votre choix (consentement ou refus), sa date et la version de ce texte sont mémorisés sur l'appareil pour ne pas vous le redemander à chaque ouverture ; il vous sera redemandé si ce texte change de façon substantielle.</li>
        <li><strong>Préférences d'affichage</strong> (thème clair/sombre, taille du texte) et <strong>choix des rapports d'erreur</strong> : mémorisées sur l'appareil. Ce ne sont pas des données de santé ; elles sont strictement nécessaires au confort d'utilisation que vous avez choisi.</li>
        <li><strong>Code-barres recherché</strong> : transmis à notre serveur puis à Open Food Facts pour obtenir la composition du produit. Il n'est pas associé à votre identité et n'est pas conservé par nous.</li>
        <li><strong>Recherche par nom de produit</strong> : le terme saisi est transmis à notre serveur (requête POST, absente des URL) puis à Open Food Facts pour obtenir des résultats. Il n'est ni enregistré, ni journalisé, ni conservé par l'application, ni stocké sur votre appareil. Open Food Facts reçoit l'adresse IP de notre serveur, pas la vôtre. [À COMPLÉTER : vérifier que les journaux de l'hébergeur n'enregistrent pas le corps des requêtes.]</li>
        <li><strong>Photo d'étiquette (fonction facultative)</strong> : envoyée à notre serveur puis à Anthropic (API Claude) pour lire la liste d'ingrédients. Elle n'est ni stockée ni journalisée par l'application et est supprimée dès la fin du traitement. [À COMPLÉTER : conditions de rétention d'Anthropic, localisation du traitement hors UE et garanties de transfert (clauses contractuelles types / DPF), DPA].</li>
        <li><strong>Rapports d'erreur anonymes (facultatif, désactivés par défaut)</strong> : uniquement si vous cochez « Envoyer des rapports d'erreur anonymes » dans Réglages, les plantages de l'application sont envoyés à notre prestataire Sentry (serveurs situés dans l'UE). Le rapport contient le type d'erreur, l'emplacement dans le code de l'application et le navigateur/système d'exploitation. Il est nettoyé avant l'envoi : aucun code-barres, nom de produit, terme de recherche, profil, favori, contenu du stockage de l'appareil, URL de page ni identifiant n'y figure. Pas d'enregistrement de session, pas de suivi de performance. Base légale : votre consentement (art. 6.1.a), retirable à tout moment en décochant la case. [À COMPLÉTER : identité du prestataire (Sentry / Functional Software, Inc.), DPA, localisation réelle du traitement et de l'hébergement UE, durée de conservation configurée dans Sentry, réglage « ne pas stocker les adresses IP » activé dans le projet, qualification de la base légale par le juriste.]</li>
        <li><strong>Journaux techniques de l'hébergeur</strong> (adresse IP, date) : sécurité et bon fonctionnement. [À COMPLÉTER : durée, hébergeur].</li>
      </ul>

      <h2>4. Ce que nous ne faisons pas</h2>
      <p>Aucun traceur tiers, aucune publicité, aucune analyse d'audience, aucune revente de données, aucun profilage. Les seuls envois à un tiers à votre initiative sont ceux décrits ci-dessus (Open Food Facts, Anthropic pour les photos, Sentry si vous l'activez).</p>

      <h2>5. Destinataires et transferts</h2>
      <p>Hébergeur ([Vercel – région UE]), Open Food Facts, Anthropic (photos d'étiquettes uniquement), Sentry (rapports d'erreur, si activés). [À COMPLÉTER : transferts hors UE et garanties pour chaque destinataire.]</p>

      <h2>6. Vos droits</h2>
      <p>Accès, rectification, effacement, limitation, portabilité, opposition, retrait du consentement. Comme les données sont locales, vous pouvez tout effacer vous-même via Réglages &gt; « Supprimer toutes mes données » (consentement, profil, historique, favoris, préférences, caches). Pour toute demande : [E-MAIL]. Réclamation possible auprès de la CNIL (cnil.fr).</p>

      <h2>7. Stockage local</h2>
      <p>Le stockage local (localStorage) et le cache du service worker sont strictement nécessaires au fonctionnement de l'application installée ; ils ne servent pas au suivi.</p>

      <h2>8. Mise à jour</h2>
      <p>Version : 2026-11-draft-2. Toute modification substantielle donnera lieu à une nouvelle demande de consentement.</p>
    </article>
  );
}
