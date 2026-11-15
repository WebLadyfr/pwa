import { norm } from "./text";

/**
 * Suggestions de saisie pour « Mon frigo » : liste statique d'aliments courants (aucun appel réseau,
 * rien n'est envoyé pendant la frappe). Ce que l'utilisatrice a déjà dans son frigo est exclu des propositions.
 */
export const FOOD_SUGGESTIONS: readonly string[] = [
  "Tomate", "Tomates cerises", "Courgette", "Aubergine", "Poivron", "Carotte", "Pomme de terre", "Patate douce", "Oignon", "Ail",
  "Poireau", "Champignons", "Épinards", "Brocoli", "Chou-fleur", "Chou", "Concombre", "Salade verte", "Avocat", "Courge", "Potiron",
  "Betterave", "Radis", "Haricots verts", "Petits pois", "Maïs doux", "Pois chiches", "Lentilles", "Haricots rouges", "Fenouil",
  "Riz basmati", "Riz complet", "Quinoa", "Sarrasin", "Polenta", "Millet", "Pâtes de riz", "Flocons d'avoine",
  "Œufs", "Poulet", "Dinde", "Bœuf haché", "Jambon blanc", "Saumon", "Thon", "Cabillaud", "Sardines", "Crevettes",
  "Yaourt nature", "Fromage blanc", "Mozzarella", "Feta", "Parmesan", "Crème fraîche", "Beurre", "Lait",
  "Pomme", "Poire", "Banane", "Citron", "Orange", "Fraises", "Framboises", "Myrtilles", "Mangue", "Ananas",
  "Huile d'olive", "Huile de colza", "Vinaigre balsamique", "Moutarde", "Olives", "Câpres",
  "Persil", "Basilic", "Coriandre", "Menthe", "Ciboulette", "Gingembre", "Curcuma", "Cumin", "Paprika", "Curry",
  "Amandes", "Noix", "Noisettes", "Graines de courge", "Graines de lin", "Graines de chia", "Lait de coco", "Noix de coco râpée",
  "Châtaignes", "Tapioca", "Fécule de maïs", "Farine de riz", "Farine de sarrasin", "Cacao en poudre",
];

/** Propositions pour un début de saisie (max 6), hors aliments déjà présents. */
export function suggest(input: string, existing: readonly string[] = [], max = 6): string[] {
  const q = norm(input).trim();
  if (q.length < 1) return [];
  const have = new Set(existing.map((e) => norm(e)));
  const starts: string[] = [];
  const contains: string[] = [];
  for (const s of FOOD_SUGGESTIONS) {
    const n = norm(s);
    if (have.has(n)) continue;
    if (n.startsWith(q)) starts.push(s);
    else if (n.includes(q)) contains.push(s);
  }
  return [...starts, ...contains].slice(0, max);
}
