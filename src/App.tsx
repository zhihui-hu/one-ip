import { Link, Route, Routes } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layout";
import { AboutPage } from "@/views/about";
import { HomePage } from "@/views/home";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route
          path="*"
          element={
            <section className="flex flex-col items-center gap-6 py-16">
              <h1 className="text-3xl font-semibold">404 · 页面不存在</h1>
              <Button asChild>
                <Link to="/">返回首页</Link>
              </Button>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}
