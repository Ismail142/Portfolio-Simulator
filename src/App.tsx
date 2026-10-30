import { useEffect, useRef, useState } from "react";
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

const NAV_ITEMS: { id: PageId; label: string; short: string }[] = [
  { id: "simulator", label: "Portfolio Simulator", short: "SIMULATOR" },
  { id: "compound-growth", label: "Compound Growth", short: "COMPOUND" },
  { id: "retirement-planner", label: "Retirement Planner", short: "RETIREMENT" },
  { id: "yield-calculator", label: "Yield Calculator", short: "YIELD" },
  { id: "dynamic-withdrawal", label: "Dynamic Withdrawal", short: "DYNAMIC" },
  { id: "sp500-returns", label: "S&P 500 Returns", short: "S&P 500" },
  { id: "crypto-returns", label: "Crypto Returns", short: "CRYPTO" },
  { id: "usdghs-returns", label: "USD/GHS Returns", short: "USD/GHS" },
];

const PAGE_META: Record<PageId, { title: string; subtitle: string }> = {
  simulator: {
    title: "PORTFOLIO SIMULATOR",
    subtitle:
      "Choose % withdrawal or fixed monthly amount · monthly contributions included",
  },
  "compound-growth": {
    title: "COMPOUND GROWTH",
    subtitle:
      "Calculate how your investment grows with compound interest and regular contributions",
  },
  "retirement-planner": {
    title: "RETIREMENT DRAWDOWN PLANNER",
    subtitle:
      "Solve for the exact monthly withdrawal that draws your portfolio to $0 at your life expectancy",
  },
  "yield-calculator": {
    title: "PORTFOLIO YIELD CALCULATOR",
    subtitle:
      "Enter USD or GHS value · see monthly and annual yield at 4–8% · live currency conversion",
  },
  "dynamic-withdrawal": {
    title: "DYNAMIC WITHDRAWAL SIMULATOR",
    subtitle: `Test dynamic withdrawal against real S&P 500 returns 1926–${new Date().getFullYear()} · USD & GHS`,
  },
  "sp500-returns": {
    title: "S&P 500 RETURNS",
    subtitle:
      "Choose any window length · rolling CAGRs · annual return distributions · best / median / worst periods",
  },
  "crypto-returns": {
    title: "CRYPTO RETURNS",
    subtitle:
      "Bitcoin annual returns · choose any window length · rolling CAGRs · best / median / worst periods",
  },
  "usdghs-returns": {
    title: "USD/GHS RETURNS",
    subtitle:
      "USD to GHS exchange-rate annual returns · choose any window length · rolling CAGRs · best / median / worst periods",
  },
};

const PAGE_COMPONENTS: Record<PageId, React.ComponentType> = {
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

  // Persist active page
  useEffect(() => {
    try {
      window.localStorage.setItem(PAGE_STORAGE_KEY, page);
    } catch {
      /* ignore */
    }
  }, [page]);

  // Save/restore scroll when switching pages
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
    }
    const y = scrollPositions.current[page] ?? 0;
    const id = window.requestAnimationFrame(() => {
      window.scrollTo(0, y);
    });
    return () => window.cancelAnimationFrame(id);
  }, [page]);

  // Persist scroll on leave / hide (refresh, tab close, background)
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
    window.addEventListener("pagehide", persist);
    window.addEventListener("beforeunload", persist);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") persist();
    });
    return () => {
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("beforeunload", persist);
    };
  }, []);

  const goTo = (id: PageId) => {
    setPage(id);
    setMenuOpen(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070710",
        color: "#e6e6f0",
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <style>{`
        .rate-btn { border: 1px solid #333; background: transparent; color: #666; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-family: 'DM Mono', monospace; font-size: 13px; transition: all 0.15s; }
        .rate-btn.active { border-color: currentColor; background: #ffffff12; }
        .stat-card { background: #0e0e18; border: 1px solid #1a1a28; border-radius: 10px; padding: 16px; }
        .stat-label { font-size: 11px; color: #666; letter-spacing: 1.5px; margin-bottom: 6px; }
        .stat-value { font-size: 22px; color: #00ff87; font-weight: 500; }
        .chart-card { background: #0e0e18; border: 1px solid #1a1a28; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .chart-title { font-size: 12px; color: #888; letter-spacing: 2px; margin-bottom: 16px; }
        .slider-wrap { display: flex; flex-direction: column; gap: 8px; }
        .slider-label { display: flex; justify-content: space-between; font-size: 12px; color: #888; letter-spacing: 1px; }
        .slider-val { color: #00ff87; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; color: #666; font-weight: 400; letter-spacing: 1px; font-size: 11px; padding: 10px 12px; border-bottom: 1px solid #1a1a28; }
        td { padding: 12px; border-bottom: 1px solid #14141c; }
        .num-input { width: 100%; background: #07070d; border: 1px solid #1a1a28; color: #00ff87; font-family: 'DM Mono', monospace; font-size: 15px; padding: 8px 10px; border-radius: 6px; outline: none; text-align: right; }
        .num-input:focus { border-color: #00ff87; box-shadow: 0 0 0 2px #00ff8722; }
        .num-input::-webkit-outer-spin-button, .num-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .num-input[type=number] { -moz-appearance: textfield; }
        .calc-bar { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-top: 16px; flex-wrap: wrap; }
        .calc-hint { font-size: 12px; color: #ffbe0b; letter-spacing: 0.5px; }
        .calc-btn { background: #00ff87; color: #050510; border: none; padding: 12px 28px; border-radius: 8px; font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 3px; cursor: pointer; box-shadow: 0 0 20px #00ff8744; transition: all 0.15s; }
        .calc-btn:hover:not(:disabled) { background: #00ffa3; box-shadow: 0 0 28px #00ff8788; }
        .calc-btn:disabled { background: #1a1a28; color: #555; cursor: not-allowed; box-shadow: none; }
        .mode-switch { display: inline-flex; border: 1px solid #1a1a28; border-radius: 8px; overflow: hidden; background: #0e0e18; }
        .mode-btn { background: transparent; color: #666; border: none; padding: 10px 18px; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 1.5px; cursor: pointer; transition: all 0.15s; }
        .mode-btn.active { background: #00ff8722; color: #00ff87; }
        .topbar { position: sticky; top: 0; z-index: 50; background: rgba(7,7,16,0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid #1a1a28; }
        .topbar-inner { max-width: 1200px; margin: 0 auto; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; height: 56px; gap: 12px; }
        .topbar-brand { font-family: 'Bebas Neue', sans-serif; font-size: 17px; letter-spacing: 3px; color: #fff; white-space: nowrap; flex-shrink: 0; text-decoration: none; background: none; border: none; cursor: pointer; padding: 0; }
        .nav-pills { display: none; align-items: center; gap: 4px; flex: 1; justify-content: flex-end; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .nav-pills::-webkit-scrollbar { display: none; }
        .nav-pill { background: transparent; border: 1px solid transparent; color: #666; padding: 7px 12px; border-radius: 8px; cursor: pointer; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 1px; white-space: nowrap; transition: all 0.15s ease; text-decoration: none; display: inline-block; }
        .nav-pill:hover { color: #ccc; background: #ffffff08; border-color: #222; }
        .nav-pill.active { color: #00ff87; background: #00ff8714; border-color: #00ff8744; box-shadow: 0 0 12px #00ff8718; }
        .hamburger { display: flex; flex-direction: column; justify-content: center; gap: 5px; background: transparent; border: 1px solid #1a1a28; border-radius: 8px; cursor: pointer; padding: 10px; flex-shrink: 0; transition: border-color 0.15s; }
        .hamburger:hover { border-color: #333; }
        .hamburger span { display: block; width: 18px; height: 2px; background: #aaa; border-radius: 2px; transition: all 0.25s ease; }
        .hamburger.open { border-color: #00ff87; }
        .hamburger.open span { background: #00ff87; }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .mobile-menu { display: block; position: absolute; top: 56px; left: 0; right: 0; background: #0c0c14; border-bottom: 1px solid #1a1a28; z-index: 49; box-shadow: 0 12px 40px rgba(0,0,0,0.45); animation: menuSlide 0.2s ease; }
        @keyframes menuSlide { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .mobile-menu-item { display: flex; align-items: center; width: 100%; background: transparent; border: none; color: #888; padding: 16px 24px; font-family: 'DM Mono', monospace; font-size: 13px; letter-spacing: 1.5px; cursor: pointer; text-align: left; transition: all 0.15s; text-decoration: none; }
        .mobile-menu-item.active { color: #00ff87; background: linear-gradient(90deg, #00ff8712 0%, transparent 100%); }
        .mobile-menu-item:hover:not(.active) { color: #ccc; background: #ffffff06; }
        .mobile-menu-item .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: currentColor; margin-right: 14px; opacity: 0.5; flex-shrink: 0; }
        .mobile-menu-item.active .dot { opacity: 1; box-shadow: 0 0 8px currentColor; }
        .menu-backdrop { position: fixed; inset: 0; top: 56px; background: rgba(0,0,0,0.4); z-index: 48; }
        @media (min-width: 900px) {
          .nav-pills { display: flex; }
          .hamburger { display: none; }
          .mobile-menu, .menu-backdrop { display: none !important; }
          .topbar-inner { padding: 0 24px; }
        }
        @media (min-width: 1100px) {
          .nav-pill { font-size: 12px; padding: 8px 14px; letter-spacing: 1.2px; }
        }
      `}</style>

      <div className="topbar">
        <div className="topbar-inner">
          <button
            type="button"
            className="topbar-brand"
            onClick={() => goTo("simulator")}
          >
            FINANCE TOOLS
          </button>

          <nav className="nav-pills" aria-label="Main navigation">
            {NAV_ITEMS.map(({ id, short }) => (
              <button
                key={id}
                type="button"
                className={`nav-pill ${page === id ? "active" : ""}`}
                onClick={() => goTo(id)}
              >
                {short}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {menuOpen && (
          <>
            <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="mobile-menu" role="menu">
              {NAV_ITEMS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={`mobile-menu-item ${page === id ? "active" : ""}`}
                  onClick={() => goTo(id)}
                >
                  <span className="dot" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: "32px 24px 64px" }}>
        <header style={{ maxWidth: 1200, margin: "0 auto 24px" }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(32px, 4vw, 50px)",
              letterSpacing: 4,
              margin: 0,
              color: "#fff",
            }}
          >
            {meta.title}
          </h1>
          <p style={{ color: "#777", margin: "4px 0 0", fontSize: 13 }}>
            {meta.subtitle}
          </p>
        </header>

        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <ActivePage />
        </div>
      </div>
    </div>
  );
}
