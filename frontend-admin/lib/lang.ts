import { EN } from "@/lib/en";

export const LANG_COOKIE = "lang";
export const LANGS = ["id", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const toLang = (v: string | undefined): Lang => (v === "en" ? "en" : "id");

export type T = (key: string, vars?: Record<string, string | number>) => string;

/**
 * The Indonesian source text is the key, so ID can never drift from what is on screen; EN looks it up in lib/en.ts
 * and falls back to the key. `{name}` placeholders are filled from `vars` in both languages.
 */
export const makeT = (lang: Lang): T => (key, vars) => {
  const text = (lang === "en" && EN[key]) || key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : text;
};

/** Locale for dates; numbers and Rupiah keep the Indonesian format in both languages. */
export const dateLocale = (lang: Lang) => (lang === "en" ? "en-GB" : "id-ID");
