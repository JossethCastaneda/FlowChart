import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { MODULES } from "@/lib/flowchart-kit/modules";
import { NAV_GROUPS } from "@/lib/flowchart-kit/nav-items";

describe("sidebar navigation contract", () => {
  it("keeps every module registered in one navigation group", () => {
    const grouped = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.key));
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(grouped).toEqual(expect.arrayContaining(MODULES.map((module) => module.key)));
  });

  it("keeps module routes unique and active accents on declared FlowChart tokens", () => {
    const routes = MODULES.map((module) => module.route);
    expect(new Set(routes).size).toBe(routes.length);
    expect(MODULES.every((module) => module.color.startsWith("var(--fc-"))).toBe(true);
  });

  it("keeps every visible module backed by a Next dashboard route", () => {
    const hasRoute = MODULES.every((module) => {
      const relative = module.route.replace(/^\/dashboard\//, "");
      const routeDir = path.join(process.cwd(), "app", "dashboard", relative);
      return ["page.tsx", "page.ts", "page.jsx", "page.js"].some((file) =>
        fs.existsSync(path.join(routeDir, file))
      );
    });
    expect(hasRoute).toBe(true);
  });

  it("does not leave shared icon/chart palettes on removed legacy tokens", () => {
    const holoIcon = fs.readFileSync(path.join(process.cwd(), "components/ui/HoloIcon.tsx"), "utf8");
    const chartTheme = fs.readFileSync(path.join(process.cwd(), "components/ui/charts/ChartTheme.tsx"), "utf8");
    const legacyToken = /var\(--(?:cyan|emerald|amber|red|purple|mod-[^)]+|text-muted|border-strong)\)/;
    expect(holoIcon).not.toMatch(legacyToken);
    expect(chartTheme).not.toMatch(legacyToken);
  });

  it("uses a generic active marker instead of stale module selectors", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain("var(--nav-color, var(--fc-accent))");
    expect(css).toContain("width: 6px;");
    expect(css).toContain(".sidebar-group-header:focus-visible");
    expect(css).not.toContain('[data-mod="publicar"]');
  });

  it("keeps the mobile Sheet responsive and accessible", () => {
    const sheet = fs.readFileSync(path.join(process.cwd(), "components/ui/Sheet.tsx"), "utf8");
    const wrapper = fs.readFileSync(path.join(process.cwd(), "components/layout/ClientMainWrapper.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(sheet).toContain("fc-dialog-overlay ${className}");
    expect(sheet).toContain('role="dialog"');
    expect(sheet).toContain('aria-modal="true"');
    expect(sheet).toContain("ariaLabel");
    expect(sheet).toContain("previouslyFocused?.focus()");
    expect(sheet).toContain("previousOverflow");
    expect(sheet).toContain("e.key !== \"Tab\"");
    expect(css).toContain(".fc-dialog-overlay.md\\:hidden { display: none; }");
    expect(wrapper).toContain('aria-label={lang === "es" ? "Navegación principal" : "Main navigation"}');
  });

  it("does not let desktop pin state force the mobile Sheet open", () => {
    const wrapper = fs.readFileSync(path.join(process.cwd(), "components/layout/ClientMainWrapper.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(wrapper).toContain('matchMedia("(min-width: 768px)")');
    expect(wrapper).toContain("sidebarOpen && (!isDesktopViewport || !sidebarPinned)");
    expect(wrapper).toContain("sidebar-responsive");
    expect(wrapper).toContain('group.key === "sistema" ? "mt-auto');
    expect(css).toContain(".fc-sidebar.sidebar-responsive { width: 80px; }");
    expect(css).toContain("overflow: visible;");
    expect(css).toContain(".fc-sidebar.sidebar-responsive .nav-item.active::before");
    expect(css).toContain("display: block; left: 50%;");
    expect(wrapper).toContain('className="sidebar-group-content"');
    expect(css).toContain(".fc-sidebar.sidebar-responsive .sidebar-group-content { grid-template-rows: 1fr !important; }");
    expect(css).toContain(".fc-sidebar.sidebar-responsive .flowchart-logo-text { display: none; }");
    expect(css).toContain(".fc-sidebar.sidebar-responsive .flowchart-logo-mark { width: 28px !important; height: 28px !important; }");
    expect(css).toContain("@media (min-width: 1024px) and (max-width: 1279px)");
  });

  it("keeps the documented shell stacking order", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    const wrapper = fs.readFileSync(path.join(process.cwd(), "components/layout/ClientMainWrapper.tsx"), "utf8");
    expect(css).toContain("z-index: 200;");
    expect(css).toContain("z-index: 400;");
    expect(wrapper).toContain("zIndex: 100");
  });

  it("keeps the visible shell on canonical FlowChart tokens", () => {
    const mobileNav = fs.readFileSync(path.join(process.cwd(), "components/layout/MobileBottomNav.tsx"), "utf8");
    const wrapper = fs.readFileSync(path.join(process.cwd(), "components/layout/ClientMainWrapper.tsx"), "utf8");
    const workspaceSwitcher = fs.readFileSync(path.join(process.cwd(), "components/layout/WorkspaceSwitcher.tsx"), "utf8");
    const logo = fs.readFileSync(path.join(process.cwd(), "components/ui/FlowChartLogo.tsx"), "utf8");
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(mobileNav).not.toMatch(/var\(--(?:surface|surface-hover|text-secondary|text-muted|foreground)\)/);
    expect(mobileNav).toContain("z-0 pointer-events-none bg-[var(--fc-surface-hover)]");
    expect(mobileNav).toContain("relative z-10 w-5 h-5");
    expect(wrapper).not.toMatch(/var\(--(?:panel-bg|overlay-dark|foreground|text-muted|text-secondary|cyan)\)/);
    expect(workspaceSwitcher).not.toMatch(/var\(--(?:panel-bg|foreground|text-muted|text-secondary|cyan)\)/);
    expect(logo).not.toMatch(/var\(--(?:foreground|text-muted)\)/);
    expect(logo).toContain("var(--fc-font-sans)");
    expect(workspaceSwitcher).toContain("var(--fc-font-sans)");
    expect(css).toContain("--font-sans: var(--fc-font-sans);");
    expect(css).toContain("--font-display: var(--fc-font-sans);");
    expect(css).toContain("--color-cyan-500: var(--fc-accent);");
    expect(css).toContain("--color-emerald-500: var(--fc-success);");
    expect(workspaceSwitcher).toContain("controller.abort()");
    expect(workspaceSwitcher).toContain("setLoading(false)");
    expect(workspaceSwitcher).toContain('className="workspace-switcher-dropdown"');
    expect(workspaceSwitcher).toContain('aria-expanded={open}');
    expect(workspaceSwitcher).toContain('role="menu"');
    expect(mobileNav).toContain('aria-expanded={isMenuOpen}');
    expect(css).toContain(".fc-sidebar.sidebar-responsive .workspace-switcher-dropdown");
    expect(css).toContain("width: 248px;");
    expect(css).toContain("@media (min-width: 768px) and (pointer: coarse)");
    expect(css).toContain(".fc-sidebar.sidebar-responsive {\n    transform: translateX(0);");
  });
});
