import { id, type DictKey } from "./id";
import { en } from "./en";
import type { Locale } from "@/lib/types";

export type { DictKey };
export type Vars = Record<string, string | number>;
export type TFunction = (key: DictKey, vars?: Vars) => string;

export const LOCALES: Locale[] = ["id", "en"];
export const LOCALE_COOKIE = "bf_locale";

const dicts: Record<Locale, Record<DictKey, string>> = { id, en };

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : "id";
}

export function makeT(locale: Locale): TFunction {
  const dict = dicts[locale];
  return (key, vars) => {
    let s = dict[key] ?? id[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
