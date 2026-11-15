import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_VERSION, type LegalBlock } from "@/content/legal";

/** Rend le balisage minimal des textes légaux : **gras** et [texte](/chemin-interne). Aucun HTML brut, aucun lien externe. */
function inline(text: string): ReactNode[] {
  const src = text.replaceAll("{{LEGAL_VERSION}}", LEGAL_VERSION);
  return src.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/).filter(Boolean).map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link && link[2]!.startsWith("/")) return <Link key={i} href={link[2]!} className="underline">{link[1]}</Link>;
    return part;
  });
}

export function LegalText({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <section key={i} className="space-y-3" aria-labelledby={b.h ? `lg-h-${i}` : undefined}>
          {b.h && <h2 id={`lg-h-${i}`} className="mt-4 text-lg font-semibold">{b.h}</h2>}
          {b.p?.map((p, j) => <p key={j}>{inline(p)}</p>)}
          {b.ul && <ul className="list-inside list-disc space-y-2">{b.ul.map((li, j) => <li key={j}>{inline(li)}</li>)}</ul>}
        </section>
      ))}
    </>
  );
}
