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
  language: "json" | "bash";
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
    <div className="api-code-block">
      <div className="api-code-header">
        <span>{language === "json" ? "JSON" : "bash"}</span>
        <CopyButton value={code} />
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
