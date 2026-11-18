import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { RETURNS } from "./data/historicalReturns";

const STORAGE_KEY = "monte-carlo-withdrawal-inputs";
const DEFAULT_SIMS = 3000;
const MAX_SIMS = 8000;

const HIST_RETURNS = Object.values(RETURNS).filter((r) => typeof r === "number" && isFinite(r));

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1000
      ? `$${(n / 1000).toFixed(1)}K`
      : `$${n.toFixed(0)}`;

const fmtFull = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

function sampleReturn(): number {
  const i = Math.floor(Math.random() * HIST_RETURNS.length);
  return HIST_RETURNS[i] / 100;
}

/** Annual simulation: withdraw at start of year, then apply return. Returns true if portfolio lasts full horizon. */
function survives(
  startValue: number,
  monthlyWithdrawal: number,
  years: number,
): boolean {
  if (startValue <= 0) return false;
  if (monthlyWithdrawal <= 0) return true;
  const annualWithdrawal = monthlyWithdrawal * 12;
  let value = startValue;
  for (let y = 0; y < years; y++) {
    value -= annualWithdrawal;
    if (value <= 0) return false;
    value *= 1 + sampleReturn();
  }
  return value > 0;
}

function runSimulations(
  startValue: number,
  monthlyWithdrawal: number,
  years: number,
  nSims: number,
): { successRate: number; failures: number } {
  if (years <= 0 || nSims <= 0) return { successRate: 1, failures: 0 };
  let successes = 0;
  for (let i = 0; i < nSims; i++) {
    if (survives(startValue, monthlyWithdrawal, years)) successes++;
  }
  return {
    successRate: successes / nSims,
    failures: nSims - successes,
  };
}

/** Binary search for highest monthly withdrawal that meets target success rate. */
function findMaxWithdrawal(
  startValue: number,
  years: number,
  targetSuccess: number,
  nSims: number,
): number {
  if (startValue <= 0 || years <= 0) return 0;
  // Upper bound: portfolio / years (very aggressive)
  let lo = 0;
  let hi = startValue / (years * 6); // rough upper
  // Quick check if even tiny withdrawals fail
  const probe = runSimulations(startValue, hi * 0.5, years, Math.min(400, nSims));
  if (probe.successRate >= targetSuccess) {
    hi = hi * 2;
  }

  for (let iter = 0; iter < 18; iter++) {
    const mid = (lo + hi) / 2;
    const { successRate } = runSimulations(startValue, mid, years, nSims);
    if (successRate >= targetSuccess) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round(lo);
}

type Mode = "max" | "evaluate";

export default function MonteCarloWithdrawal() {
  const [mode, setMode] = useState<Mode>("max");
  const [draftPortfolio, setDraftPortfolio] = useState<number | "">(500000);
  const [draftAge, setDraftAge] = useState<number | "">(40);
  const [draftHorizon, setDraftHorizon] = useState<number | "">(30);
  const [draftWithdrawal, setDraftWithdrawal] = useState<number | "">(2500);
  const [draftTarget, setDraftTarget] = useState<number | "">(90);
  const [draftSims, setDraftSims] = useState<number | "">(DEFAULT_SIMS);

  const [portfolio, setPortfolio] = useState(500000);
  const [currentAge, setCurrentAge] = useState(40);
  const [horizon, setHorizon] = useState(30);
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState(2500);
  const [targetSuccess, setTargetSuccess] = useState(90);
  const [nSims, setNSims] = useState(DEFAULT_SIMS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Record<string, number | string>;
      const p = Math.max(0, Number(s.portfolio) || 500000);
      const a = Math.max(0, Math.min(120, Number(s.currentAge) || 40));
      const h = Math.max(1, Math.min(80, Number(s.horizon) || 30));
      const w = Math.max(0, Number(s.monthlyWithdrawal) || 2500);
      const t = Math.max(50, Math.min(99, Number(s.targetSuccess) || 90));
      const n = Math.max(200, Math.min(MAX_SIMS, Number(s.nSims) || DEFAULT_SIMS));
      const m = s.mode === "evaluate" ? "evaluate" : "max";
      setDraftPortfolio(p);
      setDraftAge(a);
      setDraftHorizon(h);
      setDraftWithdrawal(w);
      setDraftTarget(t);
      setDraftSims(n);
      setMode(m);
      setPortfolio(p);
      setCurrentAge(a);
      setHorizon(h);
      setMonthlyWithdrawal(w);
      setTargetSuccess(t);
      setNSims(n);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (vals: {
    portfolio: number;
    currentAge: number;
    horizon: number;
    monthlyWithdrawal: number;
    targetSuccess: number;
    nSims: number;
    mode: Mode;
  }) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vals));
    } catch {
      /* ignore */
    }
  };

  const isDirty =
    Number(draftPortfolio) !== portfolio ||
    Number(draftAge) !== currentAge ||
    Number(draftHorizon) !== horizon ||
    Number(draftWithdrawal) !== monthlyWithdrawal ||
    Number(draftTarget) !== targetSuccess ||
    Number(draftSims) !== nSims;

  const handleCalculate = () => {
    const p = Math.max(0, Number(draftPortfolio) || 0);
    const a = Math.max(0, Math.min(120, Number(draftAge) || 0));
    const h = Math.max(1, Math.min(80, Number(draftHorizon) || 30));
    const w = Math.max(0, Number(draftWithdrawal) || 0);
    const t = Math.max(50, Math.min(99, Number(draftTarget) || 90));
    const n = Math.max(200, Math.min(MAX_SIMS, Number(draftSims) || DEFAULT_SIMS));
    setDraftPortfolio(p);
    setDraftAge(a);
    setDraftHorizon(h);
    setDraftWithdrawal(w);
    setDraftTarget(t);
    setDraftSims(n);
    setPortfolio(p);
    setCurrentAge(a);
    setHorizon(h);
    setMonthlyWithdrawal(w);
    setTargetSuccess(t);
    setNSims(n);
    persist({
      portfolio: p,
      currentAge: a,
      horizon: h,
      monthlyWithdrawal: w,
      targetSuccess: t,
      nSims: n,
      mode,
    });
  };

  // Results computed on demand (not live) to keep UI responsive
  const [result, setResult] = useState<{
    maxMonthly?: number;
    successRate?: number;
    failures?: number;
    endAge: number;
  } | null>(null);

  const run = () => {
    handleCalculate();
    setRunning(true);
    // Allow UI to paint
    setTimeout(() => {
      const endAge = currentAge + horizon;
      if (mode === "max") {
        const maxMonthly = findMaxWithdrawal(
          portfolio,
          horizon,
          targetSuccess / 100,
          nSims,
        );
        setResult({ maxMonthly, endAge });
      } else {
        const { successRate, failures } = runSimulations(
          portfolio,
          monthlyWithdrawal,
          horizon,
          nSims,
        );
        setResult({ successRate, failures, endAge });
      }
      setRunning(false);
    }, 30);
  };

  // Simple percentile chart data for evaluate mode (success over years)
  const chartData = useMemo(() => {
    if (!result || mode !== "evaluate" || monthlyWithdrawal <= 0) return [];
    // Run a smaller set of paths and record median / 10th / 90th portfolio each year
    const paths = 400;
    const yearly: number[][] = Array.from({ length: horizon + 1 }, () => []);
    for (let i = 0; i < paths; i++) {
      let value = portfolio;
      yearly[0].push(value);
      for (let y = 1; y <= horizon; y++) {
        value -= monthlyWithdrawal * 12;
        if (value < 0) value = 0;
        else value *= 1 + sampleReturn();
        yearly[y].push(value);
      }
    }
    return yearly.map((vals, y) => {
      vals.sort((a, b) => a - b);
      const p10 = vals[Math.floor(vals.length * 0.1)];
      const p50 = vals[Math.floor(vals.length * 0.5)];
      const p90 = vals[Math.floor(vals.length * 0.9)];
      return { year: y, p10, p50, p90, age: currentAge + y };
    });
  }, [result, mode, portfolio, monthlyWithdrawal, horizon, currentAge]);

  return (
    <>
      <style>{`
        .mc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .mc-modes {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }
        .mc-mode-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.55);
          padding: 8px 16px;
          border-radius: 8px;
          font-family: "DM Mono", monospace;
          font-size: 12px;
          cursor: pointer;
          letter-spacing: 0.04em;
        }
        .mc-mode-btn.active {
          color: #00ff87;
          border-color: #00ff8744;
          background: rgba(0,255,135,0.08);
        }
        .mc-result {
          background: linear-gradient(135deg, rgba(0,255,135,0.08), rgba(0,212,255,0.06));
          border: 1px solid rgba(0,255,135,0.25);
          border-radius: 12px;
          padding: 28px 32px;
          margin: 24px 0;
          text-align: center;
        }
        .mc-result-label {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          margin-bottom: 8px;
          font-family: "DM Mono", monospace;
        }
        .mc-result-value {
          font-size: clamp(2rem, 5vw, 3rem);
          color: #00ff87;
          font-family: "Bebas Neue", sans-serif;
          letter-spacing: 0.02em;
          line-height: 1.1;
        }
        .mc-result-sub {
          margin-top: 10px;
          font-size: 14px;
          color: rgba(255,255,255,0.55);
          font-family: "DM Mono", monospace;
        }
        .mc-note {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          margin-top: 8px;
          font-family: "DM Mono", monospace;
        }
        .mc-chart-wrap {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px 12px 12px;
          height: 340px;
          margin-top: 8px;
        }
      `}</style>

      <div className="mc-modes">
        <button
          type="button"
          className={`mc-mode-btn ${mode === "max" ? "active" : ""}`}
          onClick={() => setMode("max")}
        >
          Highest Safe Withdrawal
        </button>
        <button
          type="button"
          className={`mc-mode-btn ${mode === "evaluate" ? "active" : ""}`}
          onClick={() => setMode("evaluate")}
        >
          Evaluate Amount
        </button>
      </div>

      <div className="mc-grid">
        <div className="stat-card slider-wrap">
          <div className="slider-label">
            <span>Portfolio Value</span>
            <span className="slider-val">{fmt(Number(draftPortfolio) || 0)}</span>
          </div>
          <input
            className="num-input"
            type="number"
            min={0}
            step={1000}
            value={draftPortfolio === "" ? "" : draftPortfolio}
            onChange={(e) => setDraftPortfolio(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>

        <div className="stat-card slider-wrap">
          <div className="slider-label">
            <span>Current Age</span>
            <span className="slider-val">{draftAge || "—"}</span>
          </div>
          <input
            className="num-input"
            type="number"
            min={0}
            max={120}
            value={draftAge === "" ? "" : draftAge}
            onChange={(e) => setDraftAge(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>

        <div className="stat-card slider-wrap">
          <div className="slider-label">
            <span>Horizon (years)</span>
            <span className="slider-val">{draftHorizon || "—"}</span>
          </div>
          <input
            className="num-input"
            type="number"
            min={1}
            max={80}
            value={draftHorizon === "" ? "" : draftHorizon}
            onChange={(e) => setDraftHorizon(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>

        {mode === "evaluate" && (
          <div className="stat-card slider-wrap">
            <div className="slider-label">
              <span>Monthly Withdrawal</span>
              <span className="slider-val">{fmt(Number(draftWithdrawal) || 0)}</span>
            </div>
            <input
              className="num-input"
              type="number"
              min={0}
              step={100}
              value={draftWithdrawal === "" ? "" : draftWithdrawal}
              onChange={(e) => setDraftWithdrawal(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        )}

        {mode === "max" && (
          <div className="stat-card slider-wrap">
            <div className="slider-label">
              <span>Target Success Rate</span>
              <span className="slider-val">{draftTarget || 90}%</span>
            </div>
            <input
              className="num-input"
              type="number"
              min={50}
              max={99}
              step={1}
              value={draftTarget === "" ? "" : draftTarget}
              onChange={(e) => setDraftTarget(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        )}

        <div className="stat-card slider-wrap">
          <div className="slider-label">
            <span>Simulations</span>
            <span className="slider-val">{draftSims || DEFAULT_SIMS}</span>
          </div>
          <input
            className="num-input"
            type="number"
            min={200}
            max={MAX_SIMS}
            step={100}
            value={draftSims === "" ? "" : draftSims}
            onChange={(e) => setDraftSims(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <button
          type="button"
          className="calc-btn"
          onClick={run}
          disabled={running}
        >
          {running ? "Running…" : isDirty ? "Calculate" : "Re-run"}
        </button>
        <span className="mc-note" style={{ marginLeft: 12 }}>
          Uses bootstrap resampling of historical S&P 500 annual returns
        </span>
      </div>

      {result && (
        <div className="mc-result">
          {mode === "max" && result.maxMonthly != null && (
            <>
              <div className="mc-result-label">Highest safe monthly withdrawal</div>
              <div className="mc-result-value">{fmtFull(result.maxMonthly)}</div>
              <div className="mc-result-sub">
                {targetSuccess}% chance of lasting {horizon} years (to age {result.endAge})
              </div>
            </>
          )}
          {mode === "evaluate" && result.successRate != null && (
            <>
              <div className="mc-result-label">Success probability</div>
              <div className="mc-result-value">
                {(result.successRate * 100).toFixed(1)}%
              </div>
              <div className="mc-result-sub">
                {fmtFull(monthlyWithdrawal)} / month lasts {horizon} years (to age {result.endAge}) in{" "}
                {result.failures != null ? `${nSims - result.failures}/${nSims}` : ""} paths
              </div>
            </>
          )}
        </div>
      )}

      {mode === "evaluate" && chartData.length > 1 && (
        <div className="mc-chart-wrap">
          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", margin: "0 0 12px 8px", fontFamily: "DM Mono" }}>
            Portfolio paths (10th / 50th / 90th percentile)
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="year"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "DM Mono" }}
                tickFormatter={(v) => `${v}y`}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "DM Mono" }}
                tickFormatter={(v) => fmt(v)}
                width={64}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ background: "rgba(10,10,18,0.95)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: "DM Mono" }}>
                      <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Year {label} · Age {d.age}</div>
                      <div style={{ color: "#00d4ff" }}>90th: {fmtFull(d.p90)}</div>
                      <div style={{ color: "#00ff87" }}>Median: {fmtFull(d.p50)}</div>
                      <div style={{ color: "#ffbe0b" }}>10th: {fmtFull(d.p10)}</div>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="p90" stroke="#00d4ff" fill="none" strokeWidth={1.5} isAnimationActive={false} />
              <Area type="monotone" dataKey="p50" stroke="#00ff87" fill="none" strokeWidth={2} isAnimationActive={false} />
              <Area type="monotone" dataKey="p10" stroke="#ffbe0b" fill="none" strokeWidth={1.5} isAnimationActive={false} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
