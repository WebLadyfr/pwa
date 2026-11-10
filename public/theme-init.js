/* Appliqué AVANT le premier rendu pour éviter le flash de thème / de taille de texte.
 * Fichier externe (pas de script inline) servi avec le nonce de la CSP.
 * Lit uniquement les préférences d'affichage ; aucune donnée de santé. Même clé que src/lib/prefs.ts. */
(function () {
  try {
    var p = JSON.parse(localStorage.getItem("hs:v1:prefs") || "{}");
    var d = document.documentElement;
    if (["auto", "light", "dark"].indexOf(p.theme) > -1) d.setAttribute("data-theme", p.theme);
    if (["small", "normal", "large", "xlarge"].indexOf(p.textSize) > -1) d.setAttribute("data-text", p.textSize);
  } catch (e) {}
})();
