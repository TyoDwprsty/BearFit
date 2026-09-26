import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import type { Locale, NutritionEstimate } from "@/lib/types";

const TAGS = ["veg", "protein", "carbs", "fruit", "fiber", "fried", "sweet"] as const;

const estimateSchema = z.object({
  name: z.string().catch(""),
  calories: z.coerce.number().min(0).max(5000),
  protein_g: z.coerce.number().min(0).max(500).catch(0),
  carbs_g: z.coerce.number().min(0).max(800).catch(0),
  fat_g: z.coerce.number().min(0).max(400).catch(0),
  tags: z.array(z.string()).catch([]),
  confidence: z.enum(["low", "medium", "high"]).catch("low"),
  note: z.string().catch(""),
});

const SYSTEM_PROMPT = `You are a nutrition assistant for an Indonesian diet-tracking app.
Estimate the nutrition of the WHOLE meal in the photo (all visible items, typical Indonesian home/warung portions unless the portion hint says otherwise).
Respond with ONLY a JSON object:
{"name": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number,
 "tags": string[], "confidence": "low"|"medium"|"high", "note": string}
- "tags" must only use: ${TAGS.join(", ")}.
- Round calories to the nearest 10 and macros to whole grams.
- If the image is not food, return calories 0 and confidence "low".
- "name" and "note" must be written in the requested language; "note" is one short sentence.`;

/** Asks a Groq vision model to estimate calories & macros from a meal photo. */
export async function estimateNutrition(input: {
  imageDataUrl: string;
  caption?: string;
  portion?: string;
  locale: Locale;
}): Promise<NutritionEstimate> {
  const userText = [
    `Language: ${input.locale === "en" ? "English" : "Bahasa Indonesia"}.`,
    input.portion ? `Portion hint: ${input.portion}.` : "",
    input.caption ? `User description: ${input.caption.slice(0, 300)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: serverEnv.groqVisionModel,
      temperature: 0.2,
      max_completion_tokens: 400,
      // Qwen 3.x has a thinking mode; turn it off so the reply is only the JSON object.
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userText || "Estimate this meal." },
            { type: "image_url", image_url: { url: input.imageDataUrl } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  // Defensive: drop any <think> block and keep only the outermost JSON object.
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, "");
  const jsonText = cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1) || "{}";
  const parsed = estimateSchema.parse(JSON.parse(jsonText));
  return {
    ...parsed,
    calories: Math.round(parsed.calories / 10) * 10,
    protein_g: Math.round(parsed.protein_g),
    carbs_g: Math.round(parsed.carbs_g),
    fat_g: Math.round(parsed.fat_g),
    tags: parsed.tags.filter((t): t is (typeof TAGS)[number] => (TAGS as readonly string[]).includes(t)),
  };
}
