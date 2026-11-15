import { norm, tokens } from "./text";

/**
 * Lexique : mots d'ingrédients (FR + quelques EN) -> tags normalisés Open Food Facts.
 *
 * C'est le pont entre le TEXTE LIBRE d'une recette (« farine de blé », « sauce soja ») et les règles
 * du profil, qui raisonnent en tags (`en:wheat`). Le moteur de score n'est pas modifié : on fabrique
 * des tags, le moteur les évalue.
 *
 * PRINCIPE : EN CAS DE DOUTE, ON REJETTE. Un ingrédient ambigu (« farine », « pâtes », « huile végétale »)
 * est rattaché à l'option la plus courante qui pose problème, sauf qualificatif explicite
 * (`unless` : « farine de riz », « pâtes sans gluten »). Une recette refusée à tort coûte une
 * régénération ; une recette interdite affichée à tort est une faute.
 *
 * Ce lexique est une DONNÉE à maintenir (même rôle que rules/*.json) : tout nouveau profil dont les règles
 * visent des tags absents ici doit y ajouter ses entrées. Un test vérifie que chaque tag d'ingrédient des
 * règles actuelles est atteignable depuis au moins une entrée.
 *
 * Les mots sont écrits avec leurs accents pour la lisibilité ; ils sont normalisés au chargement.
 * Correspondance par SÉQUENCE DE MOTS ENTIERS (pas de sous-chaîne : « pain » ne matche pas « épaine »).
 */
export interface LexEntry {
  /** Libellé canonique (français) : listé au modèle dans les exclusions, et cité dans les relances. */
  fr: string;
  words: string[];
  tags: string[];
  /** Qualificatifs : s'ils suivent le mot dans les 3 mots suivants, l'entrée est ignorée. */
  unless?: string[];
}

// Qualificatifs qui rendent une céréale/farine/pâte sans gluten. Volontairement strict : « sarrasin » n'y est pas
// pour les nouilles (soba = souvent mélangées à du blé).
const GF = ["sans gluten", "gluten free", "gluten-free", "riz", "maïs", "sarrasin", "blé noir", "châtaigne", "châtaignes", "quinoa", "manioc", "tapioca", "sorgho", "millet", "teff", "amande", "amandes", "coco", "lentille", "lentilles", "pois", "pois chiche", "konjac", "patate", "patates"];
const GF_NOODLE = ["sans gluten", "gluten free", "gluten-free", "riz", "konjac", "haricot", "patate", "patates"];

function e(fr: string, words: string[], tags: string[], unless?: string[]): LexEntry {
  return { fr, words, tags, ...(unless ? { unless } : {}) };
}

const WHEAT = ["en:wheat"];
const DURUM = ["en:durum-wheat", "en:wheat"];

export const LEXICON: LexEntry[] = [
  /* ---------------------------------------------------------------- gluten */
  e("blé", ["blé", "froment", "blé dur", "blé tendre"], WHEAT, ["noir"]),
  e("farine", ["farine", "farines"], WHEAT, GF), // « farine » seule = blé en cuisine courante
  e("pâtes", ["pâtes", "pâte brisée", "pâte feuilletée", "pâte sablée", "pâte à pizza", "pâte à tarte", "pâte à crêpes"], DURUM, GF_NOODLE),
  e("pain", ["pain", "pains", "baguette", "toast", "toasts", "biscotte", "biscottes", "mie de pain", "pain de mie", "pain perdu"], WHEAT, ["sans gluten", "gluten free", "gluten-free"]),
  e("semoule", ["semoule", "semoules"], ["en:semolina", "en:wheat"], ["maïs", "riz", "sans gluten"]),
  e("couscous", ["couscous"], ["en:semolina", "en:wheat"], ["maïs", "riz", "quinoa", "sans gluten"]),
  e("boulgour", ["boulgour", "bulgur"], WHEAT),
  e("orge", ["orge", "orge perlé", "orge perlée"], ["en:barley"]),
  e("seigle", ["seigle"], ["en:rye"]),
  e("épeautre", ["épeautre"], ["en:spelt"]),
  e("kamut", ["kamut"], ["en:kamut"]),
  e("triticale", ["triticale"], ["en:triticale"]),
  e("malt", ["malt", "extrait de malt"], ["en:malt", "en:barley-malt"]),
  e("seitan", ["seitan"], ["en:wheat-gluten", "en:gluten"]),
  e("gluten", ["gluten"], ["en:gluten"]),
  e("chapelure", ["chapelure", "panure", "pané", "panée", "panés", "panées", "panko", "tempura"], WHEAT, ["sans gluten", "gluten free", "maïs", "riz"]),
  e("bière", ["bière", "bières"], ["en:barley-malt", "en:gluten"]),
  e("biscuits", ["biscuit", "biscuits", "cracker", "crackers", "gâteau", "gâteaux", "cake", "muffin", "muffins", "brioche", "croissant", "croissants", "viennoiserie", "viennoiseries", "cookie", "cookies", "sablé", "sablés"], WHEAT, ["sans gluten", "gluten free", "gluten-free"]),
  e("crêpes", ["crêpe", "crêpes", "gaufre", "gaufres", "pancake", "pancakes", "tarte", "tartes", "quiche", "quiches", "pizza", "pizzas", "sandwich", "sandwichs", "croûton", "croûtons"], WHEAT, ["sans gluten", "gluten free", "gluten-free"]),
  e("wraps", ["wrap", "wraps", "tortillas", "tortilla"], WHEAT, ["maïs", "espagnole", "pomme", "pommes", "patate", "sans gluten"]),
  e("pâtes italiennes", ["spaghetti", "spaghettis", "penne", "tagliatelle", "tagliatelles", "fusilli", "macaroni", "macaronis", "lasagne", "lasagnes", "ravioli", "raviolis", "tortellini", "gnocchi", "gnocchis", "orzo", "linguine", "farfalle", "rigatoni", "coquillettes", "coquillette"], DURUM, GF_NOODLE),
  e("nouilles", ["nouille", "nouilles", "udon", "ramen", "vermicelle", "vermicelles"], WHEAT, GF_NOODLE),
  e("soba", ["soba"], WHEAT),

  /* ---------------------------------------------------------------- soja */
  e("soja", ["soja", "soya"], ["en:soy", "en:soybeans"]),
  e("sauce soja", ["sauce soja", "sauce de soja", "tamari", "shoyu"], ["en:soy-sauce", "en:soy"]),
  e("tofu", ["tofu"], ["en:tofu", "en:soy"]),
  e("tempeh", ["tempeh", "edamame", "edamames", "miso", "natto"], ["en:soy"]),
  e("lécithine de soja", ["lécithine de soja"], ["en:soy-lecithin", "en:soy"]),
  e("farine de soja", ["farine de soja"], ["en:soy-flour", "en:soy"]),
  e("huile de soja", ["huile de soja"], ["en:soybean-oil", "en:soy"]),

  /* ---------------------------------------------------------------- sucres ajoutés */
  e("sucre", ["sucre", "sucres"], ["en:sugar"]),
  e("sucre de canne", ["sucre de canne", "sucre roux", "sucre brun", "cassonade", "vergeoise"], ["en:cane-sugar", "en:brown-sugar", "en:sugar"]),
  e("sucre glace", ["sucre glace"], ["en:icing-sugar", "en:sugar"]),
  e("sirop de glucose", ["sirop de glucose", "glucose"], ["en:glucose-syrup"]),
  e("sirop de glucose-fructose", ["sirop de glucose fructose", "sirop de glucose-fructose"], ["en:glucose-fructose-syrup"]),
  e("sirop de maïs", ["sirop de maïs"], ["en:corn-syrup"]),
  e("fructose", ["fructose"], ["en:fructose"]),
  e("dextrose", ["dextrose"], ["en:dextrose"]),
  e("caramel", ["caramel"], ["en:caramel"]),
  e("sirop", ["sirop", "sirops", "mélasse", "agave", "nectar d'agave"], ["en:syrup"]), // sirop d'érable / d'agave
  // Produits composés qui contiennent presque toujours du sucre ajouté (cohérent avec ce que verrait le score sur l'étiquette).
  e("confiture", ["confiture", "confitures", "pâte à tartiner", "nutella", "chocolat au lait", "chocolat blanc", "bonbon", "bonbons", "soda", "ketchup", "sauce barbecue"], ["en:sugar"]),

  /* ---------------------------------------------------------------- huiles généralement raffinées */
  e("huile de tournesol", ["huile de tournesol"], ["en:sunflower-oil"]),
  e("huile de maïs", ["huile de maïs"], ["en:corn-oil"]),
  e("huile de coton", ["huile de coton"], ["en:cottonseed-oil"]),
  e("huile de carthame", ["huile de carthame"], ["en:safflower-oil"]),
  // Non précisée = presque toujours tournesol en pratique : on assimile (principe « en cas de doute, on rejette »).
  e("huile végétale", ["huile végétale", "huiles végétales", "margarine"], ["en:sunflower-oil"]),

  /* ---------------------------------------------------------------- algues (iode) */
  e("algues", ["algue", "algues", "kelp", "wakame", "kombu", "nori", "dulse", "laminaire", "fucus"], ["en:seaweed"]),
  e("sushi", ["sushi", "sushis", "maki", "makis"], ["en:nori", "en:seaweed"]),

  /* ---------------------------------------------------------------- édulcorants */
  e("édulcorant", ["édulcorant", "édulcorants"], ["en:sweetener"]),
  e("aspartame", ["aspartame"], ["en:e951", "en:sweetener"]),
  e("stévia", ["stévia", "stevia"], ["en:e960", "en:sweetener"]),
  e("sucralose", ["sucralose"], ["en:e955", "en:sweetener"]),
  e("acésulfame", ["acésulfame"], ["en:e950", "en:sweetener"]),
  e("xylitol", ["xylitol"], ["en:e967", "en:sweetener"]),
  e("érythritol", ["érythritol"], ["en:e968", "en:sweetener"]),

  /* ---------------------------------------------------------------- allergènes courants et autres tags
     (pas visés par le profil actuel : prêts pour AIP, cœliaque, sans lactose...) */
  e("avoine", ["avoine", "flocons d'avoine"], ["en:oat"]),
  e("lait", ["lait", "crème", "crème fraîche", "beurre", "fromage", "fromages", "yaourt", "yaourts", "yogourt", "mozzarella", "parmesan", "emmental", "gruyère", "feta", "chèvre", "ricotta", "mascarpone", "lactose", "fromage blanc", "skyr"], ["en:milk"], ["soja", "amande", "amandes", "coco", "avoine", "riz", "noisette", "cacahuète", "cacahuètes", "arachide", "cacao", "karité", "végétal", "végétale"]),
  e("œufs", ["œuf", "œufs", "omelette", "mayonnaise", "meringue"], ["en:eggs"]),
  e("arachides", ["cacahuète", "cacahuètes", "arachide", "arachides"], ["en:peanuts"]),
  e("fruits à coque", ["amande", "amandes", "noisette", "noisettes", "pistache", "pistaches", "noix de cajou", "noix de pécan", "cajou", "pécan"], ["en:nuts"]),
  e("noix", ["noix"], ["en:walnut", "en:nuts"], ["coco", "muscade", "saint", "veau"]),
  e("poisson", ["poisson", "poissons", "thon", "cabillaud", "truite", "colin", "merlu", "dorade", "bar"], ["en:fish"]),
  e("saumon", ["saumon"], ["en:salmon", "en:fish"]),
  e("sardine", ["sardine", "sardines"], ["en:sardine", "en:fish"]),
  e("maquereau", ["maquereau", "maquereaux"], ["en:mackerel", "en:fish"]),
  e("hareng", ["hareng", "harengs"], ["en:herring", "en:fish"]),
  e("anchois", ["anchois"], ["en:anchovy", "en:fish"]),
  e("sésame", ["sésame", "tahini", "tahin"], ["en:sesame-seeds"]),
  e("moutarde", ["moutarde"], ["en:mustard"]),
  e("céleri", ["céleri", "céleri-rave"], ["en:celery"]),
  e("graines de lin", ["lin", "graines de lin"], ["en:flaxseed", "en:linseed"]),
  e("graines de chia", ["chia"], ["en:chia-seed"]),
];

/* ------------------------------------------------------------------------ moteur de correspondance */

interface Compiled { entry: LexEntry; seqs: string[][]; unless: string[][] }

const COMPILED: Compiled[] = LEXICON.map((entry) => ({
  entry,
  seqs: entry.words.map(tokens).filter((s) => s.length > 0),
  unless: (entry.unless ?? []).map(tokens).filter((s) => s.length > 0),
}));

const WINDOW = 3;

function seqAt(toks: string[], seq: string[], at: number): boolean {
  if (at + seq.length > toks.length) return false;
  for (let i = 0; i < seq.length; i++) if (toks[at + i] !== seq[i]) return false;
  return true;
}

/** Mots qui, précédés de « sans », NÉGATENT la mention (« sans gluten », « sans sucre ajouté »). */
const NEGATED = new Set(["gluten", "soja", "soya", "sucre", "sucres", "algue", "algues", "edulcorant", "edulcorants", "lactose", "lait", "oeuf", "oeufs", "arachide", "arachides", "noix"]);

function markNegation(masked: boolean[], toks: string[], start: number, wordAt: number) {
  let end = wordAt;
  if ((toks[wordAt] === "sucre" || toks[wordAt] === "sucres") && (toks[wordAt + 1] === "ajoute" || toks[wordAt + 1] === "ajoutes")) end = wordAt + 1;
  for (let k = start; k <= end; k++) masked[k] = true;
}

/** Marque les mots qui font partie d'une mention négative : ils ne déclenchent aucune entrée. */
function maskNegations(toks: string[]): boolean[] {
  const masked = new Array<boolean>(toks.length).fill(false);
  for (let i = 0; i < toks.length; i++) {
    if (toks[i] === "sans" && i + 1 < toks.length) {
      let j = i + 1;
      // « sans ajout de sucre », « sans ajouter de sucre »
      if (toks[j] === "ajout" || toks[j] === "ajouter") j += toks[j + 1] === "de" || toks[j + 1] === "d" ? 2 : 1;
      if (j < toks.length && NEGATED.has(toks[j]!)) markNegation(masked, toks, i, j);
    }
    if (toks[i] === "pas" && toks[i + 1] === "de" && NEGATED.has(toks[i + 2] ?? "")) markNegation(masked, toks, i, i + 2);
    if (toks[i] === "gluten" && (toks[i + 1] === "free" || toks[i - 1] === "free")) masked[i] = true;
    if (toks[i] === "free" && toks[i - 1] === "gluten") masked[i] = true;
  }
  return masked;
}

export interface LexMatch { fr: string; tags: string[] }

/**
 * Entrées du lexique présentes dans un texte (nom d'ingrédient, titre, étape...).
 * Les mentions négatives (« sans gluten ») sont ignorées ; les qualificatifs `unless` sont cherchés
 * dans les 3 mots suivants (y compris à travers une mention négative : « pâtes sans gluten » est sûr).
 */
export function matchLexicon(text: string): LexMatch[] {
  const toks = tokens(text);
  if (toks.length === 0) return [];
  const masked = maskNegations(toks);
  const out = new Map<string, LexMatch>();
  for (const c of COMPILED) {
    for (const seq of c.seqs) {
      for (let at = 0; at + seq.length <= toks.length; at++) {
        if (!seqAt(toks, seq, at)) continue;
        let hidden = false;
        for (let k = 0; k < seq.length; k++) if (masked[at + k]) hidden = true;
        if (hidden) continue;
        const after = toks.slice(at + seq.length, at + seq.length + WINDOW);
        const safe = c.unless.some((u) => {
          for (let k = 0; k + u.length <= after.length; k++) if (u.every((w, i) => after[k + i] === w)) return true;
          return false;
        });
        if (safe) continue;
        out.set(c.entry.fr, { fr: c.entry.fr, tags: c.entry.tags });
      }
    }
  }
  return [...out.values()];
}

/** Tags normalisés d'un texte libre. */
export function tagsFromText(text: string): string[] {
  return [...new Set(matchLexicon(text).flatMap((m) => m.tags))];
}

/** Libellés français représentatifs des entrées qui portent au moins un de ces tags (pour dire au modèle quoi éviter). */
export function wordsForTags(tags: readonly string[], limit = 12): string[] {
  const wanted = new Set(tags);
  const out: string[] = [];
  for (const entry of LEXICON) {
    if (entry.tags.some((t) => wanted.has(t)) && !out.includes(entry.fr)) out.push(entry.fr);
    if (out.length >= limit) break;
  }
  return out;
}

/** Tous les tags atteignables par le lexique (utilisé par un test de cohérence avec les règles). */
export function lexiconTags(): Set<string> {
  return new Set(LEXICON.flatMap((x) => x.tags));
}

export { norm };
