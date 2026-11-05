import React from "react";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { QueryProvider } from "@/components/providers/query-provider";
import { RouteProgress } from "@/components/providers/route-progress";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { initializeLocale } from "@/i18n";
import "@/index.css";
import "@/styles/global.css";
import { WebMcp } from "@/webmcp-registration";
import { Provider } from "jotai";
import ReactDOM from "react-dom/client";

initializeLocale();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider>
      <ThemeProvider>
        <BrowserRouter>
          <WebMcp />
          <RouteProgress />
          <QueryProvider>
            <App />
          </QueryProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
);
