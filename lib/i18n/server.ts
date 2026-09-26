import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, makeT, normalizeLocale } from "./index";

export async function getLocale() {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}
