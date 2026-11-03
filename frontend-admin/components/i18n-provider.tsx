"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type Lang } from "@/lib/lang";

const LangContext = createContext<Lang>("id");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext value={lang}>{children}</LangContext>;
}

export const useLang = () => useContext(LangContext);

/** Client-side `t`; server components use getT() from lib/lang-server.ts. */
export function useT() {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}
