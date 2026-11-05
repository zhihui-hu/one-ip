import { useMemo } from "react";
import { CopyButton } from "@/components/copy-button";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import json from "shiki/langs/json.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";

const highlighter = createHighlighterCoreSync({
  langs: [json, bash],
  themes: [githubLight, githubDark],
  engine: createJavaScriptRegexEngine(),
});

export function ApiCodeBlock({
  code,
  language,
}: {
  code: string;
  language: "json" | "bash" | "text";
}) {
  const html = useMemo(
    () =>
      highlighter.codeToHtml(code, {
        lang: language,
        themes: { light: "github-light", dark: "github-dark" },
      }),
    [code, language],
  );
  return (
    <div className="overflow-hidden rounded-[8px] border border-[#d1d9e0] bg-[#fff] dark:border-[#3d444d] dark:bg-[#24292e] [&_code]:font-[ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]">
      <div className="flex items-center justify-between border-b border-b-[#d1d9e0] bg-[#f6f8fa] px-4 py-2 text-[12px] font-medium text-[#59636e] dark:border-[#3d444d] dark:bg-[#161b22] dark:text-[#9198a1]">
        <span>
          {language === "json" ? "JSON" : language === "text" ? "TXT" : "bash"}
        </span>
        <CopyButton value={code} />
      </div>
      {/* Shiki markup: dark mode swaps its inline light colors for the dark theme vars. */}
      <div
        className="[&_pre.shiki]:m-0 [&_pre.shiki]:overflow-x-auto [&_pre.shiki]:px-5 [&_pre.shiki]:py-4 [&_pre.shiki]:text-[13px]/[1.7] [&_pre.shiki]:whitespace-pre dark:[&_.shiki]:bg-(--shiki-dark-bg)! dark:[&_.shiki]:text-(color:--shiki-dark)! dark:[&_.shiki_span]:bg-(--shiki-dark-bg)! dark:[&_.shiki_span]:text-(color:--shiki-dark)!"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
