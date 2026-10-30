import { useEffect, useRef, useState, type ComponentType } from "react";
import PortfolioSimulator from "./PortfolioSimulator";
import CompoundGrowth from "./CompoundGrowth";
import RetirementDrawdown from "./RetirementDrawdown";
import PortfolioYield from "./PortfolioYield";
import DynamicWithdrawal from "./DynamicWithdrawal";
import SP500Returns from "./SP500Returns";
import CryptoReturns from "./CryptoReturns";
import UsdGhsReturns from "./UsdGhsReturns";

type PageId =
  | "simulator"
  | "compound-growth"
  | "retirement-planner"
  | "yield-calculator"
  | "dynamic-withdrawal"
  | "sp500-returns"
  | "crypto-returns"
  | "usdghs-returns";

const PAGE_STORAGE_KEY = "finance-tools-active-page";
const SCROLL_STORAGE_KEY = "finance-tools-scroll-positions";

const NAV_GROUPS: {
  label: string;
  items: { id: PageId; label: string; short: string }[];
}[] = [
  {
    label: "Planners",
    items: [
      { id: "simulator", label: "Portfolio Simulator", short: "Simulator" },
      { id: "compound-growth", label: "Compound Growth", short: "Compound" },
      { id: "retirement-planner", label: "Retirement Planner", short: "Retirement" },
      { id: "yield-calculator", label: "Yield Calculator", short: "Yield" },
      { id: "dynamic-withdrawal", label: "Dynamic Withdrawal", short: "Dynamic" },
    ],
  },
  {
    label: "Markets",
    items: [
      { id: "sp500-returns", label: "S&P 500 Returns", short: "S&P 500" },
      { id: "crypto-returns", label: "Crypto Returns", short: "Crypto" },
      { id: "usdghs-returns", label: "USD/GHS Returns", short: "USD/GHS" },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);

const PAGE_META: Record<PageId, { title: string; subtitle: string; group: string }> = {
  simulator: {
    title: "Portfolio Simulator",
    subtitle:
      "Model percentage or fixed monthly withdrawals with optional contributions",
    group: "Planners",
  },
  "compound-growth": {
    title: "Compound Growth",
    subtitle: "Project investment growth with regular contributions over time",
    group: "Planners",
  },
  "retirement-planner": {
    title: "Retirement Drawdown",
    subtitle: "Solve for the monthly withdrawal that depletes the portfolio at life expectancy",
    group: "Planners",
  },
  "yield-calculator": {
    title: "Yield Calculator",
    subtitle: "Estimate monthly and annual income at 4–8% · USD & GHS",
    group: "Planners",
  },
  "dynamic-withdrawal": {
    title: "Dynamic Withdrawal",
    subtitle: `Backtest withdrawal rates against S&P 500 returns · 1926–${new Date().getFullYear()}`,
    group: "Planners",
  },
  "sp500-returns": {
    title: "S&P 500 Returns",
    subtitle: "Rolling CAGRs, return distributions, and best / median / worst windows",
    group: "Markets",
  },
  "crypto-returns": {
    title: "Crypto Returns",
    subtitle: "Bitcoin annual returns · rolling windows and extreme periods",
    group: "Markets",
  },
  "usdghs-returns": {
    title: "USD / GHS Returns",
    subtitle: "Exchange-rate annual returns · rolling windows and extremes",
    group: "Markets",
  },
};

const PAGE_COMPONENTS: Record<PageId, ComponentType> = {
  simulator: PortfolioSimulator,
  "compound-growth": CompoundGrowth,
  "retirement-planner": RetirementDrawdown,
  "yield-calculator": PortfolioYield,
  "dynamic-withdrawal": DynamicWithdrawal,
  "sp500-returns": SP500Returns,
  "crypto-returns": CryptoReturns,
  "usdghs-returns": UsdGhsReturns,
};

function isPageId(value: unknown): value is PageId {
  return typeof value === "string" && value in PAGE_META;
}

function loadInitialPage(): PageId {
  if (typeof window === "undefined") return "simulator";
  try {
    const raw = window.localStorage.getItem(PAGE_STORAGE_KEY);
    if (isPageId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "simulator";
}

function loadScrollPositions(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SCROLL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [page, setPage] = useState<PageId>(loadInitialPage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const scrollPositions = useRef<Record<string, number>>(loadScrollPositions());
  const prevPageRef = useRef<PageId>(page);
  const meta = PAGE_META[page];
  const ActivePage = PAGE_COMPONENTS[page];

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.history.scrollRestoration = "manual";
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PAGE_STORAGE_KEY, page);
    } catch {
      /* ignore */
    }
  }, [page]);

  useEffect(() => {
    const prev = prevPageRef.current;
    if (prev !== page) {
      scrollPositions.current[prev] = window.scrollY;
      try {
        window.localStorage.setItem(
          SCROLL_STORAGE_KEY,
          JSON.stringify(scrollPositions.current),
        );
      } catch {
        /* ignore */
      }
      prevPageRef.current = page;
      setContentKey((k) => k + 1);
    }
    const y = scrollPositions.current[page] ?? 0;
    const id = window.requestAnimationFrame(() => {
      window.scrollTo(0, y);
    });
    return () => window.cancelAnimationFrame(id);
  }, [page]);

  useEffect(() => {
    const persist = () => {
      scrollPositions.current[prevPageRef.current] = window.scrollY;
      try {
        window.localStorage.setItem(PAGE_STORAGE_KEY, prevPageRef.current);
        window.localStorage.setItem(
          SCROLL_STORAGE_KEY,
          JSON.stringify(scrollPositions.current),
        );
      } catch {
        /* ignore */
      }
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("pagehide", persist);
    window.addEventListener("beforeunload", persist);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("beforeunload", persist);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const goTo = (id: PageId) => {
    setPage(id);
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <style>{`
        .app-shell {
          min-height: 100vh;
          background:
            radial-gradient(ellipse 80% 50% at 50% -20%, #0a1a14 0%, transparent 55%),
            var(--app-bg);
          color: var(--app-text);
          font-family: var(--app-font-mono);
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          height: var(--app-topbar-h);
          background: rgba(7, 7, 16, 0.78);
          backdrop-filter: blur(18px) saturate(1.2);
          -webkit-backdrop-filter: blur(18px) saturate(1.2);
          border-bottom: 1px solid var(--app-border);
        }
        .topbar-inner {
          max-width: var(--app-max);
          margin: 0 auto;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          gap: 12px;
        }
        .topbar-brand {
          font-family: var(--app-font-display);
          font-size: 18px;
          letter-spacing: 3px;
          color: #fff;
          white-space: nowrap;
          flex-shrink: 0;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 0;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: color 0.15s ease;
        }
        .topbar-brand:hover { color: var(--app-accent); }
        .brand-mark {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          background: var(--app-accent);
          box-shadow: 0 0 12px var(--app-accent-glow);
          flex-shrink: 0;
        }

        .nav-pills {
          display: none;
          align-items: center;
          gap: 2px;
          flex: 1;
          justify-content: flex-end;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          mask-image: linear-gradient(90deg, transparent, #000 8px, #000 calc(100% - 8px), transparent);
        }
        .nav-pills::-webkit-scrollbar { display: none; }
        .nav-group {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .nav-divider {
          width: 1px;
          height: 20px;
          background: var(--app-border);
          margin: 0 8px;
          flex-shrink: 0;
        }
        .nav-pill {
          background: transparent;
          border: 1px solid transparent;
          color: var(--app-text-dim);
          padding: 7px 11px;
          min-height: 36px;
          border-radius: 8px;
          cursor: pointer;
          font-family: var(--app-font-mono);
          font-size: 11px;
          letter-spacing: 0.6px;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .nav-pill:hover {
          color: #ccc;
          background: #ffffff08;
          border-color: #222;
        }
        .nav-pill.active {
          color: var(--app-accent);
          background: var(--app-accent-dim);
          border-color: #00ff8744;
          box-shadow: 0 0 12px #00ff8718;
        }

        .hamburger {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          background: transparent;
          border: 1px solid var(--app-border);
          border-radius: 8px;
          cursor: pointer;
          padding: 11px;
          flex-shrink: 0;
          transition: border-color 0.15s, background 0.15s;
          min-width: 42px;
          min-height: 42px;
        }
        .hamburger:hover { border-color: #333; background: #ffffff06; }
        .hamburger span {
          display: block;
          width: 18px;
          height: 2px;
          background: #aaa;
          border-radius: 2px;
          transition: all 0.25s ease;
        }
        .hamburger.open { border-color: var(--app-accent); }
        .hamburger.open span { background: var(--app-accent); }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        .menu-backdrop {
          position: fixed;
          inset: 0;
          top: var(--app-topbar-h);
          background: rgba(0, 0, 0, 0.55);
          z-index: 48;
          animation: fadeIn 0.18s ease;
        }
        .mobile-menu {
          position: absolute;
          top: var(--app-topbar-h);
          left: 0;
          right: 0;
          max-height: min(72vh, 520px);
          overflow-y: auto;
          background: var(--app-bg-elevated);
          border-bottom: 1px solid var(--app-border);
          z-index: 49;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
          animation: menuSlide 0.2s ease;
          padding: 8px 0 16px;
        }
        @keyframes menuSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mobile-group-label {
          font-size: 10px;
          letter-spacing: 2px;
          color: var(--app-text-dim);
          text-transform: uppercase;
          padding: 14px 24px 6px;
        }
        .mobile-menu-item {
          display: flex;
          align-items: center;
          width: 100%;
          background: transparent;
          border: none;
          color: #888;
          padding: 14px 24px;
          min-height: 48px;
          font-family: var(--app-font-mono);
          font-size: 14px;
          letter-spacing: 0.8px;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .mobile-menu-item.active {
          color: var(--app-accent);
          background: linear-gradient(90deg, #00ff8712 0%, transparent 100%);
        }
        .mobile-menu-item:hover:not(.active) {
          color: #ccc;
          background: #ffffff06;
        }
        .mobile-menu-item .dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          margin-right: 14px;
          opacity: 0.45;
          flex-shrink: 0;
        }
        .mobile-menu-item.active .dot {
          opacity: 1;
          box-shadow: 0 0 8px currentColor;
        }

        .page-wrap {
          padding: 28px 20px 80px;
        }
        .page-header {
          max-width: var(--app-max);
          margin: 0 auto 28px;
        }
        .page-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          letter-spacing: 2px;
          color: var(--app-text-dim);
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .page-eyebrow-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--app-accent);
          opacity: 0.8;
        }
        .page-title {
          font-family: var(--app-font-display);
          font-size: clamp(30px, 5vw, 46px);
          letter-spacing: 2.5px;
          margin: 0;
          color: #fff;
          line-height: 1.05;
          font-weight: 400;
        }
        .page-subtitle {
          color: var(--app-text-muted);
          margin: 10px 0 0;
          font-size: 13px;
          line-height: 1.55;
          max-width: 54ch;
        }
        .page-content {
          max-width: var(--app-max);
          margin: 0 auto;
        }
        .page-enter {
          animation: pageIn 0.28s ease both;
        }

        @media (min-width: 960px) {
          .nav-pills { display: flex; }
          .hamburger { display: none; }
          .mobile-menu, .menu-backdrop { display: none !important; }
          .topbar-inner { padding: 0 24px; }
          .page-wrap { padding: 36px 24px 96px; }
        }
        @media (min-width: 1100px) {
          .nav-pill { font-size: 12px; padding: 8px 13px; }
        }
      `}</style>

      <header className="topbar">
        <div className="topbar-inner">
          <button
            type="button"
            className="topbar-brand"
            onClick={() => goTo("simulator")}
            aria-label="Finance Tools home"
          >
            <span className="brand-mark" aria-hidden />
            FINANCE TOOLS
          </button>

          <nav className="nav-pills" aria-label="Main navigation">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label} className="nav-group">
                {gi > 0 && <span className="nav-divider" aria-hidden />}
                {group.items.map(({ id, short, label }) => (
                  <button
                    key={id}
                    type="button"
                    className={`nav-pill ${page === id ? "active" : ""}`}
                    onClick={() => goTo(id)}
                    title={label}
                    aria-current={page === id ? "page" : undefined}
                  >
                    {short}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <button
            type="button"
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {menuOpen && (
          <>
            <div
              className="menu-backdrop"
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <div className="mobile-menu" role="menu" aria-label="Tools">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="mobile-group-label">{group.label}</div>
                  {group.items.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitem"
                      className={`mobile-menu-item ${page === id ? "active" : ""}`}
                      onClick={() => goTo(id)}
                      aria-current={page === id ? "page" : undefined}
                    >
                      <span className="dot" />
                      {label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </header>

      <main className="page-wrap">
        <header className="page-header">
          <div className="page-eyebrow">
            <span className="page-eyebrow-dot" aria-hidden />
            {meta.group}
          </div>
          <h1 className="page-title">{meta.title}</h1>
          <p className="page-subtitle">{meta.subtitle}</p>
        </header>

        <div className="page-content page-enter" key={contentKey}>
          <ActivePage />
        </div>
      </main>
    </div>
  );
}
