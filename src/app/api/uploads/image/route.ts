import { createHash } from "crypto";

import { jsonCreated, jsonError, isNextResponse } from "@/lib/api/http";
import { requireApiUser } from "@/lib/api/require-user";

export const dynamic = "force-dynamic";

/**
 * POST /api/uploads/image — accepts multipart `file`, returns a durable HTTPS URL.
 * Demo storage uses a content-seeded picsum URL (same pattern as the listing wizard).
 */
export async function POST(request: Request) {
  const user = await requireApiUser();
  if (isNextResponse(user)) return user;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Expected multipart form data.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Missing image file.", 400, { field: "file" });
  }
  if (!file.type.startsWith("image/")) {
    return jsonError("File must be an image (JPEG, PNG, or WEBP).", 400, { field: "file" });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha1").update(buffer).update(file.name).digest("hex").slice(0, 16);
  const url = `https://picsum.photos/seed/${hash}/800/800`;

  return jsonCreated({ url, name: file.name, bytes: buffer.length });
}
