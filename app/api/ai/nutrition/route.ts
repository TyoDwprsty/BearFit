import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { isGroqConfigured } from "@/lib/env";
import { estimateNutrition, guessMeal } from "@/lib/groq";

const bodySchema = z.object({
  image: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .max(4_000_000), // Groq's base64 image limit is 4 MB
  caption: z.string().max(500).optional(),
  portion: z.enum(["small", "medium", "large"]).optional(),
  // "guess" = what is on the plate (no calories); "estimate" = calories for the confirmed meal.
  mode: z.enum(["guess", "estimate"]).default("estimate"),
});

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isGroqConfigured()) return Response.json({ error: "groq_not_configured" }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const { image, caption, portion, mode } = parsed.data;
  const input = { imageDataUrl: image, caption, portion, locale: viewer.profile.locale };
  try {
    return Response.json(mode === "guess" ? await guessMeal(input) : await estimateNutrition(input));
  } catch (err) {
    console.error("[ai/nutrition]", mode, err);
    return Response.json({ error: "estimate_failed" }, { status: 502 });
  }
}
