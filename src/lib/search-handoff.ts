/**
 * Passe le terme de recherche de l'accueil à la page de recherche SANS l'écrire dans l'URL, le stockage ou les journaux
 * (le terme peut révéler un régime). Variable de module : vit le temps de la navigation interne, puis est consommée.
 */
let pending: string | null = null;

export function setPendingSearch(q: string): void {
  pending = q;
}

export function takePendingSearch(): string {
  const q = pending ?? "";
  pending = null;
  return q;
}
