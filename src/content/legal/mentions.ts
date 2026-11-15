import type { LegalBlock } from "./types";

/** Mentions légales. Modèle à faire relire par un juriste ; [À COMPLÉTER] = information à fournir. */
export const MENTIONS: LegalBlock[] = [
  {
    "h": "Éditeur",
    "p": [
      "[À COMPLÉTER : nom / raison sociale, forme juridique, capital, RCS/SIRET, adresse, téléphone, n° TVA]."
    ]
  },
  {
    "h": "Directeur de la publication",
    "p": [
      "[À COMPLÉTER : nom du directeur de la publication]."
    ]
  },
  {
    "h": "Contact",
    "p": [
      "[À COMPLÉTER : adresse e-mail de contact]. Vous pouvez aussi nous écrire depuis Réglages > À propos > Contact."
    ]
  },
  {
    "h": "Hébergeur",
    "p": [
      "[À COMPLÉTER : hébergeur. Si Vercel : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA, fonctions déployées en région UE (Paris) ; à vérifier]."
    ]
  },
  {
    "h": "Données et crédits",
    "p": [
      "Données produits : Open Food Facts, licence ODbL. Lecture d'étiquettes : API Claude (Anthropic)."
    ]
  },
  {
    "h": "Avertissement santé",
    "p": [
      "Voir la page [Avertissement médical](/legal/avertissement)."
    ]
  }
];
