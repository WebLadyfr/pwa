import type { LegalBlock } from "./types";

/** Licences et sources de données. Versions : voir package.json (dernière vérification 15 nov. 2026). */
export const LICENCES: LegalBlock[] = [
  {
    h: "Open Food Facts (attribution obligatoire)",
    p: [
      "Les informations sur les produits (noms, ingrédients, additifs, valeurs nutritionnelles) proviennent d'**Open Food Facts** (world.openfoodfacts.org), base de données collaborative et ouverte.",
      "Le contenu de la base est disponible sous licence **ODbL** (Open Database License) ; les données individuelles sous licence DbCL ; les images de produits sous licence CC BY-SA. Immulea n'est ni affiliée à Open Food Facts, ni approuvée par ce projet.",
      "Ces données sont fournies par des contributeurs et peuvent contenir des erreurs.",
    ],
  },
  {
    h: "Lecture d'étiquettes par IA",
    p: ["La lecture facultative d'une photo d'étiquette utilise l'API Claude d'Anthropic. Voir la [politique de confidentialité](/legal/confidentialite) pour le détail des échanges de données."],
  },
  {
    h: "Logiciels libres utilisés",
    ul: [
      "Next.js, React, Tailwind CSS, Sentry (SDK navigateur, activé seulement avec votre accord), Zod : licence MIT.",
      "html5-qrcode (lecture des codes-barres) : licence Apache 2.0.",
      "[À COMPLÉTER : liste exhaustive générée avant lancement, par exemple avec un outil de recensement des licences, y compris les dépendances indirectes.]",
    ],
  },
];
