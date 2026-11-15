import { redirect } from "next/navigation";

/** Ancienne adresse conservée (liens existants) : le contenu vit désormais dans /legal/confidentialite. */
export default function Privacy() {
  redirect("/legal/confidentialite");
}
