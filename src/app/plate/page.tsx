import { redirect } from "next/navigation";

/** Ancienne page « assiette » : fusionnée dans l'écran Scan (onglet assiette). */
export default function PlatePage() {
  redirect("/scan?mode=plate");
}
