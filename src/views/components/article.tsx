import { useEffect, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PageHeading, Pending, ErrorNotice } from "@/components/toolkit";
import { UnderlineHover } from "@/components/underline-hover";
import { useQuery } from "@tanstack/react-query";

interface Article {
  title: string;
  html: string;
  source: string;
}
const claudeArticles = import.meta.glob<Article>(
  "../claude/articles/content/*.json",
  { import: "default" },
);
const gptArticles = import.meta.glob<Article>(
  "../gpt/articles/content/*.json",
  { import: "default" },
);
export default function ArticlePage() {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const kind = pathname.startsWith("/claude/") ? "claude" : "gpt";
  const filename = pathname.split("/").at(-1);
  const modules = kind === "claude" ? claudeArticles : gptArticles;
  const loader = modules[`../${kind}/articles/content/${filename}.json`];
  const query = useQuery({
    queryKey: ["article", pathname],
    queryFn: () => loader(),
    enabled: !!loader,
    staleTime: Infinity,
  });
  useEffect(() => {
    if (hash && query.data) {
      const id = decodeURIComponent(hash.slice(1));
      document.getElementById(id)?.scrollIntoView();
    }
  }, [hash, query.data]);
  function navigateLink(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = (event.target as Element).closest("a");
    if (
      !anchor ||
      anchor.target === "_blank" ||
      anchor.hasAttribute("download")
    )
      return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin === window.location.origin) {
      event.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    }
  }
  if (!loader)
    return (
      <>
        <PageHeading
          title="文章未收录"
          description="该地址没有对应的参考站内容快照。"
        />
        <Link to="/news/">返回资讯</Link>
      </>
    );
  return (
    <>
      {query.isPending ? (
        <p className="status-line">
          <Pending>正在加载文章…</Pending>
        </p>
      ) : query.data ? (
        <>
          <PageHeading title={query.data.title} description="拓展阅读" />
          <p className="snapshot-note">
            参考站文章快照（2026-09-09），观点与技术结论未经独立核验。
            <UnderlineHover asChild>
              <a href={query.data.source} target="_blank" rel="noreferrer">
                查看来源 ↗
              </a>
            </UnderlineHover>
          </p>
          <div
            className="article-content"
            onClick={navigateLink}
            dangerouslySetInnerHTML={{ __html: query.data.html }}
          />
          <div className="reading">
            <UnderlineHover asChild>
              <Link to="/news/">← 返回 AI 资讯</Link>
            </UnderlineHover>
          </div>
        </>
      ) : (
        <ErrorNotice error={query.error} />
      )}
    </>
  );
}
