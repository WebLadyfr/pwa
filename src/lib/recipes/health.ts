import config from "./config/health-claims.json";
import { tokens } from "./text";

/**
 * Filtre de sortie : allégations de santé. La liste vit dans config/health-claims.json (à maintenir).
 * Mots entiers, sans accents ni casse ; « * » final = préfixe de mot.
 */
interface Term { seq: string[]; prefix: boolean; label: string }

const TERMS: Term[] = (config.terms as string[])
  .map((raw) => {
    const prefix = raw.endsWith("*");
    const seq = tokens(prefix ? raw.slice(0, -1) : raw);
    return { seq, prefix, label: raw };
  })
  .filter((t) => t.seq.length > 0);

/** Termes interdits trouvés dans le texte (liste vide = rien à signaler). */
export function findHealthClaims(text: string): string[] {
  const toks = tokens(text);
  const found = new Set<string>();
  for (const term of TERMS) {
    const last = term.seq.length - 1;
    for (let at = 0; at + term.seq.length <= toks.length; at++) {
      let ok = true;
      for (let k = 0; k < term.seq.length && ok; k++) {
        const w = toks[at + k]!;
        const want = term.seq[k]!;
        ok = k === last && term.prefix ? w.startsWith(want) : w === want;
      }
      if (ok) {
        found.add(term.label);
        break;
      }
    }
  }
  return [...found];
}
