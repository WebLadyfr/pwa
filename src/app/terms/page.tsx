import { Draft } from "@/components/Draft";

export const metadata = { title: "Conditions générales d'utilisation" };

export default function Terms() {
  return (
    <article className="space-y-4 leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold">
      <h1 className="text-xl font-semibold">Conditions générales d'utilisation</h1>
      <Draft />

      <h2>1. Objet</h2>
      <p>L'application « Scan Hashimoto » permet de scanner un produit alimentaire et d'afficher une analyse indicative de sa composition au regard de critères de bien-être alimentaire.</p>

      <h2>2. Nature de l'information</h2>
      <p><strong>Information bien-être indicative. Ne remplace pas l'avis d'un professionnel de santé. Ne constitue ni un diagnostic ni un traitement.</strong> L'application ne promet aucun effet sur une maladie. Demandez conseil à votre médecin ou diététicien avant toute modification de votre alimentation ou de votre suivi.</p>

      <h2>3. Exactitude des données</h2>
      <p>Les informations produits proviennent d'Open Food Facts, base collaborative (licence ODbL) pouvant contenir des erreurs ou être incomplètes. La lecture d'étiquette par IA peut comporter des erreurs. Vérifiez toujours l'emballage du produit, notamment en cas d'allergie.</p>

      <h2>4. Utilisation</h2>
      <p>Usage personnel et non commercial. Il est interdit d'automatiser l'accès au service, de le perturber ou d'en détourner les fonctions.</p>

      <h2>5. Responsabilité</h2>
      <p>[À COMPLÉTER par un juriste : limitation de responsabilité conforme au droit applicable, obligations de moyens, droits des consommateurs.]</p>

      <h2>6. Propriété intellectuelle</h2>
      <p>[À COMPLÉTER.] Les données Open Food Facts restent soumises à la licence ODbL.</p>

      <h2>7. Droit applicable</h2>
      <p>[À COMPLÉTER : droit français, médiation de la consommation, juridiction compétente.]</p>
    </article>
  );
}
