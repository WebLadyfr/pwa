import type { LegalBlock } from "./types";

/**
 * Avertissement médical. Le paragraphe principal (la phrase obligatoire) n'est PAS ici : la page l'affiche depuis
 * la clé i18n « disclaimer », la même que le pied de page, l'écran d'accueil et le résultat de scan (source unique).
 */
export const AVERTISSEMENT: LegalBlock[] = [
  {
    h: "Ce que fait l'application",
    p: [
      "Oleamune lit la composition d'un aliment et affiche un score **indicatif** fondé sur des critères alimentaires de bien-être. Ces critères sont rédigés d'après des sources publiques et doivent être validés par un professionnel de santé ([À COMPLÉTER : relecture médicale]).",
    ],
  },
  {
    h: "Ce qu'elle ne fait pas",
    ul: [
      "Elle ne pose aucun diagnostic et ne propose aucun traitement.",
      "Elle ne remplace ni votre médecin, ni votre diététicien, ni votre pharmacien.",
      "Elle ne tient pas compte de votre situation personnelle complète (traitements, allergies, grossesse, etc.).",
    ],
  },
  {
    h: "En cas de doute",
    p: [
      "Parlez-en à un professionnel de santé avant de modifier votre alimentation. En cas d'urgence, contactez le 15 (SAMU) ou le 112.",
      "Les données produits peuvent être incomplètes ou erronées : vérifiez toujours l'étiquette du produit, surtout en cas d'allergie.",
    ],
  },
];
