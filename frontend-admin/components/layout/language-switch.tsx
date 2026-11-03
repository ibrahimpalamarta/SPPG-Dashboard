"use client";

import { useRouter } from "next/navigation";
import { useLang, useT } from "@/components/i18n-provider";
import { MorphSelect } from "@/components/ui/morph-select";
import { LANG_COOKIE, LANGS, toLang } from "@/lib/lang";

export function LanguageSwitch() {
  const router = useRouter();
  const lang = useLang();
  const t = useT();
  return (
    <MorphSelect
      label={t("Bahasa")}
      className="w-20"
      value={lang}
      options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))}
      onChange={(v) => {
        document.cookie = `${LANG_COOKIE}=${toLang(v)}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
    />
  );
}
