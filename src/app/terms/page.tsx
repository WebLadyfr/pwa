import { redirect } from "next/navigation";

/** Ancienne adresse conservée (liens existants) : le contenu vit désormais dans /legal/cgu. */
export default function Terms() {
  redirect("/legal/cgu");
}
