/* Appliqué AVANT le premier rendu pour éviter le flash de thème / de taille de texte / de sens de lecture.
 * Fichier externe (pas de script inline) servi avec le nonce de la CSP.
 * Lit uniquement des préférences d'affichage (thème, taille, langue) ; aucune donnée de santé.
 * Mêmes clés que src/lib/prefs.ts et src/i18n/index.ts. */
(function () {
  try {
    var d = document.documentElement;
    var p = JSON.parse(localStorage.getItem("hs:v1:prefs") || "{}");
    if (["auto", "light", "dark"].indexOf(p.theme) > -1) d.setAttribute("data-theme", p.theme);
    if (["small", "normal", "large", "xlarge"].indexOf(p.textSize) > -1) d.setAttribute("data-text", p.textSize);
    var l = localStorage.getItem("hs:v1:lang");
    if (["fr", "en", "ar"].indexOf(l) > -1) {
      d.setAttribute("lang", l);
      d.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
    }
  } catch (e) {}
})();
