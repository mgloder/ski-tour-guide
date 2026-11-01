"use client";

import { useLocale } from "@/components/i18n-provider";

export default function LangToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "zh" : "en")}
      className="bx-btn bx-btn-ghost bx-btn-xs"
      title={locale === "en" ? "切换到中文" : "Switch to English"}
      style={{ fontFamily: "inherit", minWidth: "2.6rem" }}
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );
}
