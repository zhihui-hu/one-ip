import { useEffect } from "react";
import { t } from "@/i18n";
import { SplitResults } from "@/views/home/split-results";

export default function ExitsPage() {
  useEffect(() => {
    document.title = t("分流出口 - IP 网络工具");
  }, []);
  return (
    <>
      <h1 className="sr-only">{t("分流出口")}</h1>
      <SplitResults />
    </>
  );
}
