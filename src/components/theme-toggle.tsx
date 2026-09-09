import { type MouseEvent as ReactMouseEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Settings2, Sun } from "lucide-react";

const THEME_ITEMS = [
  { value: "light", label: "浅色模式", icon: Sun },
  { value: "dark", label: "深色模式", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
] as const;

type ThemeValue = (typeof THEME_ITEMS)[number]["value"];

// 颜色选项：只负责设置 data-color，真正改 --primary 在 CSS 里做
const COLOR_ITEMS = [
  { value: "zinc", label: "雾灰", dotClass: "bg-zinc-500" },
  { value: "red", label: "红色", dotClass: "bg-red-500" },
  { value: "rose", label: "玫红", dotClass: "bg-rose-500" },
  { value: "orange", label: "橙色", dotClass: "bg-orange-500" },
  { value: "green", label: "绿色", dotClass: "bg-green-500" },
  { value: "blue", label: "蓝色", dotClass: "bg-blue-500" },
  { value: "yellow", label: "琥珀", dotClass: "bg-yellow-500" },
  { value: "violet", label: "紫罗兰", dotClass: "bg-violet-500" },
] as const;

type ColorValue = (typeof COLOR_ITEMS)[number]["value"] | "default";

const RADIUS_ITEMS = [
  { value: "0", label: "0" },
  { value: "0.25", label: "0.25" },
  { value: "0.5", label: "0.5" },
  { value: "0.75", label: "0.75" },
  { value: "1", label: "1" },
] as const;

type RadiusValue = (typeof RADIUS_ITEMS)[number]["value"];

const LAYOUT_ITEMS = [
  { value: "full", label: "全宽" },
  { value: "centered", label: "居中" },
] as const;

type LayoutValue = (typeof LAYOUT_ITEMS)[number]["value"];

const FONT_SIZE_ITEMS = [
  { value: "default", label: "默认" },
  { value: "sm", label: "小号" },
  { value: "md", label: "标准" },
  { value: "lg", label: "大号" },
] as const;

type FontSizeValue = (typeof FONT_SIZE_ITEMS)[number]["value"];
type ViewTransition = {
  ready: Promise<void>;
};
type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateTheme: () => void) => ViewTransition;
};

const runThemeTransition = (
  event: ReactMouseEvent<HTMLElement> | null,
  updateTheme: () => void,
) => {
  const documentWithViewTransition = document as DocumentWithViewTransition;

  if (
    typeof document === "undefined" ||
    typeof window === "undefined" ||
    typeof documentWithViewTransition.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    updateTheme();
    return;
  }

  const pointerX = event?.clientX ?? Math.floor(window.innerWidth / 2);
  const pointerY = event?.clientY ?? Math.floor(window.innerHeight / 2);

  const transition = documentWithViewTransition.startViewTransition(() => {
    updateTheme();
  });

  transition.ready
    .then(() => {
      const radius = Math.hypot(
        Math.max(pointerX, window.innerWidth - pointerX),
        Math.max(pointerY, window.innerHeight - pointerY),
      );

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${pointerX}px ${pointerY}px)`,
            `circle(${radius}px at ${pointerX}px ${pointerY}px)`,
          ],
        },
        {
          duration: 500,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      /* fallback silently */
    });
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();

  // index.html restores these attributes before React starts.
  const [activeColor, setActiveColor] = useState<ColorValue>(
    () => (document.documentElement.dataset.color as ColorValue) || "default",
  );
  const [activeRadius, setActiveRadius] = useState<RadiusValue>(
    () => (document.documentElement.dataset.radius as RadiusValue) || "0.5",
  );
  const [activeLayout, setActiveLayout] = useState<LayoutValue>(
    () => (document.documentElement.dataset.layout as LayoutValue) || "full",
  );
  const [activeFontSize, setActiveFontSize] = useState<FontSizeValue>(
    () =>
      (document.documentElement.dataset.fontSize as FontSizeValue) || "default",
  );
  const activeTheme = theme;

  // 保留原来的亮/暗/系统逻辑 + 动画
  const handleThemeSelection =
    (value: ThemeValue) => (event: ReactMouseEvent<HTMLElement>) => {
      runThemeTransition(event, () => setTheme(value));
    };

  // 颜色
  const handleColorChange = (value: ColorValue) => () => {
    if (typeof document === "undefined") return;
    if (value === "default") {
      document.documentElement.removeAttribute("data-color");
      window.localStorage.removeItem("ui-color");
    } else {
      document.documentElement.dataset.color = value;
      window.localStorage.setItem("ui-color", value);
    }
    setActiveColor(value);
  };

  // 圆角
  const handleRadiusChange = (value: RadiusValue) => () => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.radius = value;
    window.localStorage.setItem("ui-radius", value);
    setActiveRadius(value);
  };

  // 布局
  const handleLayoutChange = (value: LayoutValue) => () => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.layout = value;
    window.localStorage.setItem("ui-layout", value);
    setActiveLayout(value);
  };

  const handleFontSizeChange = (value: FontSizeValue) => () => {
    if (typeof document === "undefined") return;
    if (value === "default") {
      document.documentElement.removeAttribute("data-font-size");
      window.localStorage.removeItem("ui-font-size");
    } else {
      document.documentElement.dataset.fontSize = value;
      window.localStorage.setItem("ui-font-size", value);
    }
    setActiveFontSize(value);
  };

  const handleReset = () => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.removeAttribute("data-color");
    root.removeAttribute("data-radius");
    root.removeAttribute("data-layout");
    root.removeAttribute("data-font-size");
    window.localStorage.removeItem("ui-color");
    window.localStorage.removeItem("ui-radius");
    window.localStorage.removeItem("ui-layout");
    window.localStorage.removeItem("ui-font-size");
    setActiveColor("default");
    setActiveRadius("0.5");
    setActiveLayout("full");
    setActiveFontSize("default");
    runThemeTransition(null, () => setTheme("system"));
  };

  const triggerButton = (
    <Button
      variant="outline"
      size="icon"
      className={cn("relative size-10 rounded-full", className)}
      aria-label="外观设置"
    >
      <Settings2 className="h-[1.1rem] w-[1.1rem]" />
      <span className="sr-only">外观设置</span>
    </Button>
  );

  const content = (
    <>
      <p className=" block sm:hidden px-2 pb-2 text-xs text-muted-foreground">
        选择主题、主色、圆角、字体与布局。
      </p>

      {/* Color */}
      <div className="space-y-2 px-2 pb-3 sm:pt-2">
        <p className="text-xs font-medium text-muted-foreground">主色</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleColorChange("default")}
            className={cn(
              "flex items-center justify-between rounded-md border px-3 py-2 text-xs",
              activeColor === "default" &&
                "border-primary bg-primary/5 ring-1 ring-primary/40",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span>跟随站点默认</span>
            </span>
          </button>
          {COLOR_ITEMS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={handleColorChange(item.value)}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2 text-xs",
                "transition-colors",
                activeColor === item.value &&
                  "border-primary bg-primary/5 ring-1 ring-primary/40",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", item.dotClass)}
                />
                <span>{item.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div className="space-y-2 px-2 pb-3">
        <p className="text-xs font-medium text-muted-foreground">圆角</p>
        <div className="grid grid-cols-5 gap-2">
          {RADIUS_ITEMS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={handleRadiusChange(item.value)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                activeRadius === item.value &&
                  "border-primary bg-primary/5 ring-1 ring-primary/40",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div className="space-y-2 px-2 pb-3">
        <p className="text-xs font-medium text-muted-foreground">字体大小</p>
        <div className="grid grid-cols-4 gap-2">
          {FONT_SIZE_ITEMS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={handleFontSizeChange(item.value)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                activeFontSize === item.value &&
                  "border-primary bg-primary/5 ring-1 ring-primary/40",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color mode */}
      <div className="space-y-2 px-2 pb-3">
        <p className="text-xs font-medium text-muted-foreground">主题模式</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTheme === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={handleThemeSelection(item.value)}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs",
                  isActive &&
                    "border-primary bg-primary/5 ring-1 ring-primary/40",
                )}
              >
                <Icon className="h-3 w-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layout */}
      <Separator />
      <div className="space-y-2 px-2 py-3">
        <p className="text-xs font-medium text-muted-foreground">内容布局</p>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUT_ITEMS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={handleLayoutChange(item.value)}
              className={cn(
                "rounded-md border px-3 py-2 text-xs",
                activeLayout === item.value &&
                  "border-primary bg-primary/5 ring-1 ring-primary/40",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />
      <div className="px-2 pb-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-center text-xs"
          onClick={handleReset}
        >
          恢复默认
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="px-0 pb-6">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-base text-left pl-5 font-semibold">
              外观与主题
            </DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto px-3 ">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
