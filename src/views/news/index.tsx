import { Link, useLocation } from "react-router-dom";
import { PageHeading } from "@/components/toolkit";
import { UnderlineHover } from "@/components/underline-hover";
import content from "./content.json";

const tags = [
  "Claude",
  "OpenAI",
  "ChatGPT",
  "Codex",
  "Claude Code",
  "API",
  "Gemini",
  "MCP",
];
type NewsItem = {
  path: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
};
export default function NewsPage() {
  const { pathname } = useLocation();
  const key =
    pathname.endsWith(".html") || pathname.endsWith("/")
      ? pathname
      : `${pathname}/`;
  const pages = content as Record<string, NewsItem[]>;
  const articles = pages[key];
  return (
    <>
      <PageHeading
        title="AI 资讯"
        description="AI 行业资讯、产品动态与网络工具使用指南"
      />
      <p className="snapshot-note">
        参考站内容快照 · 2026-09-09 · 文章观点与时效性未独立核验
      </p>
      <nav className="news-tags" aria-label="资讯分类">
        <UnderlineHover asChild>
          <Link className={key === "/news/" ? "selected" : ""} to="/news/">
            全部
          </Link>
        </UnderlineHover>
        {tags.map((tag) => (
          <UnderlineHover asChild key={tag}>
            <Link
              className={
                key.includes(`/tag/${tag.replaceAll(" ", "-")}/`)
                  ? "selected"
                  : ""
              }
              to={`/news/tag/${tag.replaceAll(" ", "-")}/`}
            >
              {tag}
            </Link>
          </UnderlineHover>
        ))}
      </nav>
      {articles ? (
        <div className="news-grid">
          {articles.map((article) => (
            <Link className="news-card" to={article.path} key={article.path}>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
              <div className="news-meta">
                <time>{article.date}</time>
                {article.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="status-line">此资讯分页暂无已收录内容。</p>
      )}
      <nav className="news-pagination" aria-label="资讯分页">
        {Object.keys(pages)
          .filter((p) => /^\/news\/(?:\d+\.html)?$/.test(p))
          .sort(
            (a, b) =>
              Number(a.match(/\d+/)?.[0] ?? 1) -
              Number(b.match(/\d+/)?.[0] ?? 1),
          )
          .map((path) => (
            <UnderlineHover asChild key={path}>
              <Link className={key === path ? "selected" : ""} to={path}>
                {path.match(/\d+/)?.[0] ?? "1"}
              </Link>
            </UnderlineHover>
          ))}
      </nav>
      <section className="reading">
        <h2>站内工具</h2>
        <div className="reading-grid">
          {[
            ["/claude/", "Claude 检测"],
            ["/gpt/", "Codex 检测"],
            ["/ip/", "IP 评分"],
            ["/whois/", "WHOIS 查询"],
            ["/link/", "网络连通性测试"],
            ["/dns/", "DNS 泄露检测"],
          ].map(([path, label]) => (
            <UnderlineHover asChild key={path}>
              <Link to={path}>{label}</Link>
            </UnderlineHover>
          ))}
        </div>
      </section>
    </>
  );
}
