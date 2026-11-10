import { Draft } from "@/components/Draft";

export const metadata = { title: "Mentions légales" };

export default function Legal() {
  return (
    <article className="space-y-4 leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold">
      <h1 className="text-xl font-semibold">Mentions légales</h1>
      <Draft />
      <h2>Éditeur</h2>
      <p>[Nom / raison sociale, forme juridique, capital, RCS/SIRET, adresse, e-mail, téléphone, n° TVA, directeur de la publication].</p>
      <h2>Hébergeur</h2>
      <p>[Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA — fonctions déployées en région UE (Paris)]. [À vérifier.]</p>
      <h2>Données et crédits</h2>
      <p>Données produits : <a className="underline" href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a>, licence ODbL. Lecture d'étiquettes : API Claude (Anthropic).</p>
      <h2>Avertissement santé</h2>
      <p>Information bien-être indicative. Ne remplace pas l'avis d'un professionnel de santé. Ne constitue ni un diagnostic ni un traitement.</p>
    </article>
  );
}
