import type { MealType } from "@/lib/types";

export type FoodKind = "oat" | "salad" | "rice" | "fruit";

export const FOOD_ART_BY_MEAL: Record<MealType, { kind: FoodKind; bg: string }> = {
  breakfast: { kind: "oat", bg: "bg-mango-s" },
  lunch: { kind: "salad", bg: "bg-mint-s" },
  dinner: { kind: "rice", bg: "bg-sky-s" },
  snack: { kind: "fruit", bg: "bg-berry-s" },
};

/** Placeholder illustration for a meal without a photo. */
export function FoodArt({ kind = "oat", size = 120 }: { kind?: FoodKind; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      {kind === "oat" && (
        <g>
          <ellipse cx="50" cy="84" rx="30" ry="4" fill="#2B2335" opacity="0.08" />
          <path d="M16 50 H84 A34 30 0 0 1 16 50 Z" fill="#FFFFFF" stroke="#EADCCB" strokeWidth="2" />
          <path d="M24 62 Q50 70 76 62" stroke="#FF8A3D" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="50" rx="34" ry="8" fill="#F3D9A8" />
          <circle cx="38" cy="47" r="6" fill="#FFE58A" stroke="#F2C94C" strokeWidth="1.5" />
          <circle cx="51" cy="45" r="6" fill="#FFE58A" stroke="#F2C94C" strokeWidth="1.5" />
          <circle cx="63" cy="48" r="6" fill="#FFE58A" stroke="#F2C94C" strokeWidth="1.5" />
          <circle cx="45" cy="52" r="3" fill="#5B6CE0" />
          <circle cx="58" cy="53" r="3" fill="#5B6CE0" />
          <circle cx="71" cy="51" r="2.6" fill="#5B6CE0" />
        </g>
      )}
      {kind === "salad" && (
        <g>
          <ellipse cx="50" cy="84" rx="30" ry="4" fill="#2B2335" opacity="0.08" />
          <circle cx="34" cy="46" r="10" fill="#58C26B" />
          <circle cx="48" cy="40" r="11" fill="#7ED957" />
          <circle cx="63" cy="44" r="10" fill="#58C26B" />
          <circle cx="74" cy="49" r="7" fill="#7ED957" />
          <circle cx="42" cy="47" r="5" fill="#FF6B6B" />
          <circle cx="57" cy="49" r="4.5" fill="#FF6B6B" />
          <ellipse cx="66" cy="44" rx="7" ry="5" fill="#FFFFFF" />
          <circle cx="66" cy="44" r="2.6" fill="#FFC940" />
          <path d="M16 50 H84 A34 30 0 0 1 16 50 Z" fill="#3CCB9A" />
          <ellipse cx="50" cy="50" rx="34" ry="5" fill="#2FB386" />
          <path d="M26 62 Q50 70 74 62" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
        </g>
      )}
      {kind === "rice" && (
        <g>
          <ellipse cx="50" cy="82" rx="36" ry="4" fill="#2B2335" opacity="0.08" />
          <ellipse cx="50" cy="64" rx="42" ry="16" fill="#FFFFFF" stroke="#EADCCB" strokeWidth="2" />
          <ellipse cx="50" cy="64" rx="33" ry="11" fill="none" stroke="#F3EADF" strokeWidth="2" />
          <path d="M22 64 A16 15 0 0 1 54 64 Z" fill="#E9C9B8" stroke="#D9AE98" strokeWidth="1.5" />
          <ellipse cx="68" cy="58" rx="14" ry="9" fill="#D98B4A" />
          <path d="M60 55 L66 61 M66 53 L73 60 M72 52 L77 57" stroke="#A85F2A" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="42" cy="70" rx="8" ry="2.6" fill="#58C26B" transform="rotate(-12 42 70)" />
          <ellipse cx="54" cy="72" rx="8" ry="2.6" fill="#58C26B" transform="rotate(10 54 72)" />
          <circle cx="66" cy="71" r="3.2" fill="#FF8A3D" />
          <circle cx="74" cy="68" r="3.2" fill="#FF8A3D" />
        </g>
      )}
      {kind === "fruit" && (
        <g>
          <ellipse cx="50" cy="82" rx="32" ry="4" fill="#2B2335" opacity="0.08" />
          <circle cx="40" cy="48" r="15" fill="#FF6B6B" />
          <path d="M40 34 Q41 28 44 25" stroke="#A96A3D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="48" cy="28" rx="6" ry="3" fill="#58C26B" transform="rotate(-30 48 28)" />
          <circle cx="66" cy="50" r="13" fill="#FFA94D" />
          <circle cx="62" cy="45" r="3" fill="#FFFFFF" opacity="0.5" />
          <path d="M20 62 Q44 82 76 60 Q74 67 69 70 Q44 84 22 67 Z" fill="#FFE58A" stroke="#F2C94C" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}
