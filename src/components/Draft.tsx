import { Icon } from "@/components/Icon";
/** Bandeau pour les textes juridiques : à retirer UNIQUEMENT après relecture par un juriste. */
export function Draft() {
  return (
    <p role="note" className="rounded-xl border-2 border-warn-ring bg-warn-bg p-3 text-warn-fg">
      <Icon name="alert" className="me-1 h-4 w-4 align-[-0.15em]" />
      Modèle de texte à faire relire et compléter par un juriste avant tout lancement.
    </p>
  );
}
