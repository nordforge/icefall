import { c as createComponent } from './astro-component_V3IdGX8g.mjs';
import 'piccolore';
import { o as createRenderInstruction, g as addAttribute, r as renderTemplate, m as maybeRenderHead, p as renderComponent, q as Fragment, t as renderSlot, v as renderTransition, w as createTransitionScope, x as renderHead } from './server_DJHjoBUH.mjs';
import 'clsx';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import { X } from 'lucide-preact';
import { jsx, jsxs, Fragment as Fragment$1 } from 'preact/jsx-runtime';

async function renderScript(result, id) {
  const inlined = result.inlinedScripts.get(id);
  let content = "";
  if (inlined != null) {
    if (inlined) {
      content = `<script type="module">${inlined}</script>`;
    }
  } else {
    const resolved = await result.resolve(id);
    content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"></script>`;
  }
  return createRenderInstruction({ type: "script", id, content });
}

const $$ClientRouter = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$ClientRouter;
  const { fallback = "animate" } = Astro2.props;
  return renderTemplate`<meta name="astro-view-transitions-enabled" content="true"><meta name="astro-view-transitions-fallback"${addAttribute(fallback, "content")}>${renderScript($$result, "/Users/nickbevers/Documents/open-source/icefall/dashboard/node_modules/astro/components/ClientRouter.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/nickbevers/Documents/open-source/icefall/dashboard/node_modules/astro/components/ClientRouter.astro", void 0);

const sidebar = "_sidebar_1n3gq_1";
const logo = "_logo_1n3gq_22";
const logoIcon = "_logoIcon_1n3gq_33";
const subtitle = "_subtitle_1n3gq_46";
const nav = "_nav_1n3gq_53";
const navItem = "_navItem_1n3gq_61";
const navItemActive = "_navItemActive_1n3gq_81";
const navIcon = "_navIcon_1n3gq_93";
const footer = "_footer_1n3gq_99";
const footerStatus = "_footerStatus_1n3gq_107";
const footerActions = "_footerActions_1n3gq_115";
const statusDotGreen = "_statusDotGreen_1n3gq_122";
const backdrop$1 = "_backdrop_1n3gq_135";
const hamburger = "_hamburger_1n3gq_150";
const sidebarStyles = {
	sidebar: sidebar,
	logo: logo,
	logoIcon: logoIcon,
	subtitle: subtitle,
	nav: nav,
	navItem: navItem,
	navItemActive: navItemActive,
	navIcon: navIcon,
	footer: footer,
	footerStatus: footerStatus,
	footerActions: footerActions,
	statusDotGreen: statusDotGreen,
	backdrop: backdrop$1,
	hamburger: hamburger
};

const version = "0.1.0";
const pkg = {
  version};

const $$Sidebar = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Sidebar;
  const currentPath = Astro2.url.pathname;
  const navItems = [
    { href: "/", label: "Apps", icon: "grid" },
    { href: "/projects", label: "Projects", icon: "folder" },
    { href: "/databases", label: "Databases", icon: "database" },
    { href: "/server", label: "Server", icon: "server" },
    { href: "/users", label: "Users", icon: "users" },
    { href: "/profile", label: "Profile", icon: "profile" },
    { href: "/settings", label: "Settings", icon: "settings" },
    { href: "/docs", label: "Docs", icon: "book" }
  ];
  function isActive(href) {
    if (href === "/") {
      return currentPath === "/" || currentPath.startsWith("/apps");
    }
    return currentPath.startsWith(href);
  }
  return renderTemplate`${maybeRenderHead()}<aside${addAttribute(`ice-sidebar ${sidebarStyles.sidebar}`, "class")}> <a href="/"${addAttribute(sidebarStyles.logo, "class")}> <span${addAttribute(sidebarStyles.logoIcon, "class")}> <svg aria-hidden="true" width="20" height="20" viewBox="0 0 512 512" fill="none"> <path d="M161 291L231 426L221 231L131 321Z" fill="currentColor"></path> <path d="M236 86L326 181L251 426L231 426Z" fill="currentColor"></path> <path d="M361 321L271 426L306 251L381 296Z" fill="currentColor"></path> </svg> </span> <span>
Icefall
<span${addAttribute(sidebarStyles.subtitle, "class")}>v${pkg.version}</span> </span> </a>  <nav aria-label="Main"${addAttribute(sidebarStyles.nav, "class")} id="sidebar-nav"> ${navItems.map((item, i) => renderTemplate`<a${addAttribute(item.href, "href")}${addAttribute(isActive(item.href) ? "page" : void 0, "aria-current")}${addAttribute([sidebarStyles.navItem, isActive(item.href) && sidebarStyles.navItemActive], "class:list")} data-astro-prefetch="hover"${addAttribute(i === 0 ? 0 : -1, "tabindex")}${addAttribute(i, "data-nav-index")}> <svg aria-hidden="true"${addAttribute(sidebarStyles.navIcon, "class")} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"> ${item.icon === "grid" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect>` })}`} ${item.icon === "folder" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>` })}`} ${item.icon === "database" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>` })}`} ${item.icon === "server" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`<rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect><circle cx="6" cy="6" r="1" fill="currentColor"></circle><circle cx="6" cy="18" r="1" fill="currentColor"></circle>` })}`} ${item.icon === "users" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>` })}`} ${item.icon === "profile" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>` })}`} ${item.icon === "settings" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`<path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle>` })}`} ${item.icon === "book" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result2) => renderTemplate`<path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"></path><path d="M4 19h16"></path><path d="M12 3v16"></path>` })}`} </svg> ${item.label} </a>`)} </nav> <div${addAttribute(sidebarStyles.footer, "class")}> ${renderComponent($$result, "UpdatePill", null, { "client:only": "preact", "client:component-hydration": "only", "client:component-path": "@islands/update/UpdatePill/UpdatePill", "client:component-export": "default" })} ${renderComponent($$result, "UpdateDialog", null, { "client:only": "preact", "client:component-hydration": "only", "client:component-path": "@islands/update/UpdateDialog/UpdateDialog", "client:component-export": "default" })} <div${addAttribute(sidebarStyles.footerStatus, "class")}> <span${addAttribute(sidebarStyles.statusDotGreen, "class")} aria-hidden="true"></span>
Operational
</div> <div${addAttribute(sidebarStyles.footerActions, "class")}> ${renderComponent($$result, "LogoutButton", null, { "client:only": "preact", "client:component-hydration": "only", "client:component-path": "@islands/shared/LogoutButton/LogoutButton", "client:component-export": "default" })} ${renderComponent($$result, "ThemeToggle", null, { "client:only": "preact", "client:component-hydration": "only", "client:component-path": "/Users/nickbevers/Documents/open-source/icefall/dashboard/src/components/theme/ThemeToggle", "client:component-export": "default" })} </div> </div> </aside> ${renderScript($$result, "/Users/nickbevers/Documents/open-source/icefall/dashboard/src/components/sidebar/Sidebar.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/nickbevers/Documents/open-source/icefall/dashboard/src/components/sidebar/Sidebar.astro", void 0);

const backdrop = "_backdrop_12yq2_2";
const dialog = "_dialog_12yq2_14";
const header = "_header_12yq2_27";
const title = "_title_12yq2_34";
const closeButton = "_closeButton_12yq2_40";
const section = "_section_12yq2_65";
const sectionTitle = "_sectionTitle_12yq2_73";
const shortcutList = "_shortcutList_12yq2_82";
const shortcutRow = "_shortcutRow_12yq2_88";
const shortcutLabel = "_shortcutLabel_12yq2_95";
const keys = "_keys_12yq2_100";
const kbd = "_kbd_12yq2_107";
const separator = "_separator_12yq2_124";
const styles = {
	backdrop: backdrop,
	dialog: dialog,
	header: header,
	title: title,
	closeButton: closeButton,
	section: section,
	sectionTitle: sectionTitle,
	shortcutList: shortcutList,
	shortcutRow: shortcutRow,
	shortcutLabel: shortcutLabel,
	keys: keys,
	kbd: kbd,
	separator: separator
};

const NAV_SHORTCUTS = [{
  keys: ["g", "h"],
  label: "Go home",
  action: () => {
    window.location.href = "/";
  }
}, {
  keys: ["g", "d"],
  label: "Go to databases",
  action: () => {
    window.location.href = "/databases";
  }
}, {
  keys: ["g", "s"],
  label: "Go to server",
  action: () => {
    window.location.href = "/server";
  }
}, {
  keys: ["g", "p"],
  label: "Go to projects",
  action: () => {
    window.location.href = "/projects";
  }
}, {
  keys: ["g", "u"],
  label: "Go to users",
  action: () => {
    window.location.href = "/users";
  }
}, {
  keys: ["g", "e"],
  label: "Go to settings",
  action: () => {
    window.location.href = "/settings";
  }
}];
const ACTION_SHORTCUTS = [{
  keys: ["c", "a"],
  label: "Create app",
  action: () => {
    window.location.href = "/apps/new";
  }
}, {
  keys: ["c", "d"],
  label: "Create database",
  action: () => {
    window.location.href = "/databases?create=true";
  }
}];
const ALL_SHORTCUTS = [...NAV_SHORTCUTS, ...ACTION_SHORTCUTS];
function isEditableTarget(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}
function ShortcutHelp({
  onClose
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const previousFocusRef = useRef(null);
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    requestAnimationFrame(() => {
      closeRef.current?.focus();
    });
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  useEffect(() => {
    function handleKeyDown2(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown2);
    return () => document.removeEventListener("keydown", handleKeyDown2);
  }, [onClose]);
  const handleKeyDown = useCallback((e) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);
  return jsx("div", {
    class: styles.backdrop,
    onClick: onClose,
    children: jsxs("div", {
      ref: dialogRef,
      class: styles.dialog,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Keyboard shortcuts",
      onClick: (e) => e.stopPropagation(),
      onKeyDown: handleKeyDown,
      children: [jsxs("div", {
        class: styles.header,
        children: [jsx("h2", {
          class: styles.title,
          children: "Keyboard Shortcuts"
        }), jsx("button", {
          ref: closeRef,
          type: "button",
          class: styles.closeButton,
          onClick: onClose,
          "aria-label": "Close shortcuts help",
          children: jsx(X, {
            size: 16,
            "aria-hidden": "true"
          })
        })]
      }), jsxs("div", {
        class: styles.section,
        children: [jsx("h3", {
          class: styles.sectionTitle,
          children: "Navigation"
        }), jsx("div", {
          class: styles.shortcutList,
          children: NAV_SHORTCUTS.map((s) => jsxs("div", {
            class: styles.shortcutRow,
            children: [jsx("span", {
              class: styles.shortcutLabel,
              children: s.label
            }), jsx("div", {
              class: styles.keys,
              children: s.keys.map((k, i) => jsxs(Fragment$1, {
                children: [jsx("kbd", {
                  class: styles.kbd,
                  children: k
                }), i < s.keys.length - 1 && jsx("span", {
                  class: styles.separator,
                  children: "then"
                })]
              }))
            })]
          }, s.label))
        })]
      }), jsxs("div", {
        class: styles.section,
        children: [jsx("h3", {
          class: styles.sectionTitle,
          children: "Actions"
        }), jsx("div", {
          class: styles.shortcutList,
          children: ACTION_SHORTCUTS.map((s) => jsxs("div", {
            class: styles.shortcutRow,
            children: [jsx("span", {
              class: styles.shortcutLabel,
              children: s.label
            }), jsx("div", {
              class: styles.keys,
              children: s.keys.map((k, i) => jsxs(Fragment$1, {
                children: [jsx("kbd", {
                  class: styles.kbd,
                  children: k
                }), i < s.keys.length - 1 && jsx("span", {
                  class: styles.separator,
                  children: "then"
                })]
              }))
            })]
          }, s.label))
        })]
      }), jsxs("div", {
        class: styles.section,
        children: [jsx("h3", {
          class: styles.sectionTitle,
          children: "General"
        }), jsx("div", {
          class: styles.shortcutList,
          children: jsxs("div", {
            class: styles.shortcutRow,
            children: [jsx("span", {
              class: styles.shortcutLabel,
              children: "Show this help"
            }), jsx("div", {
              class: styles.keys,
              children: jsx("kbd", {
                class: styles.kbd,
                children: "?"
              })
            })]
          })
        })]
      })]
    })
  });
}
function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const pendingKeyRef = useRef(null);
  const timeoutRef = useRef(null);
  useEffect(() => {
    function handleKeyDown(e) {
      if (isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }
      if (showHelp) return;
      if (pendingKeyRef.current) {
        const combo = pendingKeyRef.current + key;
        pendingKeyRef.current = null;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        const match = ALL_SHORTCUTS.find((s) => s.keys[0] + s.keys[1] === combo);
        if (match) {
          e.preventDefault();
          match.action();
        }
        return;
      }
      const isFirstKey = ALL_SHORTCUTS.some((s) => s.keys[0] === key);
      if (isFirstKey) {
        pendingKeyRef.current = key;
        timeoutRef.current = setTimeout(() => {
          pendingKeyRef.current = null;
          timeoutRef.current = null;
        }, 500);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showHelp]);
  if (showHelp) {
    return jsx(ShortcutHelp, {
      onClose: () => setShowHelp(false)
    });
  }
  return null;
}

const layout = "_layout_j3hd7_1";
const main = "_main_j3hd7_6";
const content = "_content_j3hd7_12";
const layoutStyles = {
	layout: layout,
	main: main,
	content: content};

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$DashboardLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$DashboardLayout;
  const { title } = Astro2.props;
  return renderTemplate(_a || (_a = __template(['<html lang="en"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>', ' — Icefall</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap">', "<style>\n      html { box-sizing: border-box; }\n      *, *::before, *::after { box-sizing: inherit; margin: 0; padding: 0; }\n      body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }\n      .ice-layout { display: flex; min-height: 100vh; }\n      .ice-sidebar { position: fixed; top: 0; left: 0; width: 220px; height: 100vh; z-index: 100; transform: translateX(-100%); }\n      .ice-main { flex: 1; min-width: 0; }\n      @media (min-width: 641px) {\n        .ice-sidebar { transform: translateX(0); }\n        .ice-main { margin-left: 220px; }\n      }\n    </style><script>\n      (function() {\n        var stored = localStorage.getItem('icefall-theme');\n        var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');\n        document.documentElement.setAttribute('data-theme', theme);\n      })();\n    <\/script><script>\n      fetch('/api/v1/users/me', { credentials: 'same-origin' }).then(function(r) {\n        if (r.status === 401 || r.status === 400) {\n          r.json().then(function(b) {\n            if (b.error === 'Not authenticated' || r.status === 401) {\n              window.location.href = '/login';\n            }\n          }).catch(function() { window.location.href = '/login'; });\n        }\n      }).catch(function() {});\n    <\/script>", '</head> <body>  <a href="#main-content" class="skip-link">Skip to main content</a> ', " <div", '>  <button type="button"', ' id="sidebar-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="sidebar-panel"> <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <line x1="3" y1="6" x2="21" y2="6"></line> <line x1="3" y1="12" x2="21" y2="12"></line> <line x1="3" y1="18" x2="21" y2="18"></line> </svg> </button>  <div', ' id="sidebar-backdrop" aria-hidden="true"></div> <div id="sidebar-panel"', "> ", ' </div> <main id="main-content" tabindex="-1"', "", "> <div", "> ", " </div> </main> </div> ", " ", " ", " ", " </body> </html>"])), title, renderComponent($$result, "ClientRouter", $$ClientRouter, {}), renderHead(), renderComponent($$result, "CommandPalette", null, { "client:only": "preact", "client:component-hydration": "only", "client:component-path": "@islands/shared/CommandPalette/CommandPalette", "client:component-export": "default", "data-astro-transition-persist": createTransitionScope($$result, "t4sqgro4") }), addAttribute(`ice-layout ${layoutStyles.layout}`, "class"), addAttribute(sidebarStyles.hamburger, "class"), addAttribute(sidebarStyles.backdrop, "class"), addAttribute(createTransitionScope($$result, "4mg32q25"), "data-astro-transition-persist"), renderComponent($$result, "Sidebar", $$Sidebar, {}), addAttribute(`ice-main ${layoutStyles.main}`, "class"), addAttribute(renderTransition($$result, "rczknyyt"), "data-astro-transition-scope"), addAttribute(layoutStyles.content, "class"), renderSlot($$result, $$slots["default"]), renderComponent($$result, "KeyboardShortcuts", KeyboardShortcuts, { "client:idle": true, "client:component-hydration": "idle", "client:component-path": "@islands/shared/KeyboardShortcuts/KeyboardShortcuts", "client:component-export": "default" }), renderComponent($$result, "Toast", null, { "client:only": "preact", "client:component-hydration": "only", "client:component-path": "@islands/shared/Toast/Toast", "client:component-export": "default" }), renderComponent($$result, "ReconnectOverlay", null, { "client:only": "preact", "client:component-hydration": "only", "client:component-path": "@islands/update/ReconnectOverlay/ReconnectOverlay", "client:component-export": "default" }), renderScript($$result, "/Users/nickbevers/Documents/open-source/icefall/dashboard/src/layouts/DashboardLayout.astro?astro&type=script&index=0&lang.ts"));
}, "/Users/nickbevers/Documents/open-source/icefall/dashboard/src/layouts/DashboardLayout.astro", "self");

const prerender = false;
const $$ = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "App" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AppDetailRouter", null, { "client:only": "preact", "client:component-hydration": "only", "client:component-path": "@islands/app-detail/AppDetailRouter/AppDetailRouter", "client:component-export": "default" })} ` })}`;
}, "/Users/nickbevers/Documents/open-source/icefall/dashboard/src/pages/apps/[...path].astro", void 0);

const $$file = "/Users/nickbevers/Documents/open-source/icefall/dashboard/src/pages/apps/[...path].astro";
const $$url = "/apps/[...path]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
