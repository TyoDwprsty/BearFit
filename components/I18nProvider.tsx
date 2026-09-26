"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type TFunction } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const I18nContext = createContext<{ locale: Locale; t: TFunction }>({
  locale: "id",
  t: makeT("id"),
});

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  return useContext(I18nContext);
}
