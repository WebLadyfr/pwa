import { handlePhotoRequest } from "@/lib/server/photo-route";

export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/plate  (corps = octets de l'image, Content-Type image/jpeg|png|webp) : photo d'assiette. */
export async function POST(req: Request) {
  return handlePhotoRequest(req, "plate");
}
