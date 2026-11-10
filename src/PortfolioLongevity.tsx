import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STORAGE_KEY = "portfolio-longevity-inputs";
const MAX_MONTHS = 1200; // 100 years safety cap

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

type SimPoint = { year: number; value: number };

type SimResult = {
  months: number;
  years: number;
  remainingMonths: number;
  depleted: boolean;
  sustainable: boolean;
  data: SimPoint[];
  totalWithdrawn: number;
};

function simulateLongevity(
  startValue: number,
  annualReturn: number,
  monthlyWithdrawal: number,
): SimResult {
  if (startValue <= 0) {
    return {
      months: 0,
      years: 0,
      remainingMonths: 0,
      depleted: true,
      sustainable: false,
      data: [{ year: 0, value: 0 }],
      totalWithdrawn: 0,
    };
  }

  if (monthlyWithdrawal <= 0) {
    // No withdrawals → portfolio grows forever
    const data: SimPoint[] = [];
    let value = startValue;
    const monthlyRate = annualReturn / 100 / 12;
    for (let m = 0; m <= 360; m++) {
      if (m % 12 === 0) {
        data.push({ year: m / 12, value: Math.round(value * 100) / 100 });
      }
      value *= 1 + monthlyRate;
    }
    return {
      months: Infinity,
      years: Infinity,
      remainingMonths: 0,
      depleted: false,
      sustainable: true,
      data,
      totalWithdrawn: 0,
    };
  }

  const monthlyRate = annualReturn / 100 / 12;
  let value = startValue;
  let months = 0;
  let totalWithdrawn = 0;
  const monthlyData: { month: number; value: number }[] = [{ month: 0, value }];

  // Monthly simulation: grow then withdraw
  while (value > 0 && months < MAX_MONTHS) {
    value = value * (1 + monthlyRate) - monthlyWithdrawal;
    months += 1;
    if (value < 0) {
      totalWithdrawn += monthlyWithdrawal + value; // partial last withdrawal
      value = 0;
    } else {
      totalWithdrawn += monthlyWithdrawal;
    }
    monthlyData.push({ month: months, value: Math.max(0, value) });
    if (value <= 0) break;
  }

  const depleted = value <= 0;
  const sustainable = !depleted && months >= MAX_MONTHS;

  // Downsample to yearly points for the chart (plus final point)
  const data: SimPoint[] = [];
  for (let i = 0; i < monthlyData.length; i += 12) {
    data.push({
      year: monthlyData[i].month / 12,
      value: Math.round(monthlyData[i].value * 100) / 100,
    });
  }
  // Ensure the final point is included
  const last = monthlyData[monthlyData.length - 1];
  if (data.length === 0 || data[data.length - 1].year !== last.month / 12) {
    data.push({
      year: last.month / 12,
      value: Math.round(last.value * 100) / 100,
    });
  }

  return {
    months,
    years: Math.floor(months / 12),
    remainingMonths: months % 12,
    depleted,
    sustainable,
    data,
    totalWithdrawn: Math.round(totalWithdrawn),
  };
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(10, 10, 18, 0.95)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
        fontFamily: "DM Mono, monospace",
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
        Year {Number(label).toFixed(1)}
      </div>
      <div style={{ color: "#00ff87" }}>
        Portfolio: {fmtFull(Number(payload[0].value))}
      </div>
    </div>
  );
}

export default function PortfolioLongevity() {
  const [draftPortfolio, setDraftPortfolio] = useState<number | "">(500000);
  const [draftReturn, setDraftReturn] = useState<number | "">(7);
  const [draftWithdrawal, setDraftWithdrawal] = useState<number | "">(2500);

  const [portfolio, setPortfolio] = useState(500000);
  const [annualReturn, setAnnualReturn] = useState(7);
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState(2500);

  // Load saved inputs
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        portfolio?: number;
        annualReturn?: number;
        monthlyWithdrawal?: number;
      };
      const p = Math.max(0, Number(saved.portfolio) || 0);
      const r = Number(saved.annualReturn) ?? 7;
      const w = Math.max(0, Number(saved.monthlyWithdrawal) || 0);
      setDraftPortfolio(p);
      setDraftReturn(r);
      setDraftWithdrawal(w);
      setPortfolio(p);
      setAnnualReturn(r);
      setMonthlyWithdrawal(w);
    } catch {
      /* ignore */
    }
  }, []);

  const isDirty =
    Number(draftPortfolio) !== portfolio ||
    Number(draftReturn) !== annualReturn ||
    Number(draftWithdrawal) !== monthlyWithdrawal;

  const handleCalculate = () => {
    const p = Math.max(0, Number(draftPortfolio) || 0);
    const r = Number(draftReturn) || 0;
    const w = Math.max(0, Number(draftWithdrawal) || 0);
    setDraftPortfolio(p);
    setDraftReturn(r);
    setDraftWithdrawal(w);
    setPortfolio(p);
    setAnnualReturn(r);
    setMonthlyWithdrawal(w);
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ portfolio: p, annualReturn: r, monthlyWithdrawal: w }),
      );
    } catch {
      /* ignore */
    }
  };

  const result = useMemo(
    () => simulateLongevity(portfolio, annualReturn, monthlyWithdrawal),
    [portfolio, annualReturn, monthlyWithdrawal],
  );

  const durationLabel = result.sustainable
    ? "100+ years"
    : result.months === 0
      ? "0 months"
      : result.years === 0
        ? `${result.remainingMonths} month${result.remainingMonths !== 1 ? "s" : ""}`
        : result.remainingMonths === 0
          ? `${result.years} year${result.years !== 1 ? "s" : ""}`
          : `${result.years} year${result.years !== 1 ? "s" : ""} ${result.remainingMonths} mo`;

  const statusText = result.sustainable
    ? "Sustainable — withdrawals covered by returns"
    : result.depleted
      ? `Depleted after ${durationLabel}`
      : durationLabel;

  return (
    <>
      <style>{`
        .longevity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .longevity-result {
          background: linear-gradient(135deg, rgba(0,255,135,0.08), rgba(0,212,255,0.06));
          border: 1px solid rgba(0,255,135,0.25);
          border-radius: 12px;
          padding: 28px 32px;
          margin-bottom: 28px;
          text-align: center;
        }
        .longevity-result-label {
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          margin-bottom: 8px;
          font-family: "DM Mono", monospace;
        }
        .longevity-result-value {
          font-size: clamp(2rem, 5vw, 3.2rem);
          font-weight: 500;
          color: #00ff87;
          font-family: "Bebas Neue", sans-serif;
          letter-spacing: 0.02em;
          line-height: 1.1;
        }
        .longevity-result-sub {
          margin-top: 10px;
          font-size: 14px;
          color: rgba(255,255,255,0.55);
          font-family: "DM Mono", monospace;
        }
        .longevity-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 28px;
        }
        .longevity-stat {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 16px 18px;
        }
        .longevity-stat-label {
          font-size: 11px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin-bottom: 6px;
          font-family: "DM Mono", monospace;
        }
        .longevity-stat-value {
          font-size: 1.25rem;
          color: #e8e8f0;
          font-family: "DM Mono", monospace;
        }
        .longevity-chart-wrap {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px 12px 12px;
          height: 340px;
        }
        .longevity-chart-title {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin: 0 0 12px 8px;
          font-family: "DM Mono", monospace;
        }
      `}</style>

      {/* Inputs */}
      <div className="longevity-grid">
        <div className="stat-card slider-wrap">
          <div className="slider-label">
            <span>Portfolio Value</span>
            <span className="slider-val">
              {typeof draftPortfolio === "number" && draftPortfolio > 0
                ? fmt(draftPortfolio)
                : "—"}
            </span>
          </div>
          <input
            className="num-input"
            type="number"
            min={0}
            step={1000}
            placeholder="500000"
            value={draftPortfolio === "" ? "" : draftPortfolio}
            onChange={(e) =>
              setDraftPortfolio(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>

        <div className="stat-card slider-wrap">
          <div className="slider-label">
            <span>Annual Market Return</span>
            <span className="slider-val">
              {typeof draftReturn === "number" ? `${draftReturn}%` : "—"}
            </span>
          </div>
          <input
            className="num-input"
            type="number"
            step={0.1}
            placeholder="7"
            value={draftReturn === "" ? "" : draftReturn}
            onChange={(e) =>
              setDraftReturn(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>

        <div className="stat-card slider-wrap">
          <div className="slider-label">
            <span>Monthly Withdrawal</span>
            <span className="slider-val">
              {typeof draftWithdrawal === "number" && draftWithdrawal >= 0
                ? fmt(draftWithdrawal)
                : "—"}
            </span>
          </div>
          <input
            className="num-input"
            type="number"
            min={0}
            step={100}
            placeholder="2500"
            value={draftWithdrawal === "" ? "" : draftWithdrawal}
            onChange={(e) =>
              setDraftWithdrawal(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <button
          type="button"
          className="calc-btn"
          onClick={handleCalculate}
          disabled={!isDirty}
        >
          {isDirty ? "Calculate" : "Up to date"}
        </button>
      </div>

      {/* Primary result */}
      <div className="longevity-result">
        <div className="longevity-result-label">Portfolio will last</div>
        <div className="longevity-result-value">{durationLabel}</div>
        <div className="longevity-result-sub">{statusText}</div>
      </div>

      {/* Summary stats */}
      <div className="longevity-stats">
        <div className="longevity-stat">
          <div className="longevity-stat-label">Starting Value</div>
          <div className="longevity-stat-value">{fmtFull(portfolio)}</div>
        </div>
        <div className="longevity-stat">
          <div className="longevity-stat-label">Monthly Withdrawal</div>
          <div className="longevity-stat-value">{fmtFull(monthlyWithdrawal)}</div>
        </div>
        <div className="longevity-stat">
          <div className="longevity-stat-label">Annual Return</div>
          <div className="longevity-stat-value">{annualReturn}%</div>
        </div>
        <div className="longevity-stat">
          <div className="longevity-stat-label">Total Withdrawn</div>
          <div className="longevity-stat-value">
            {result.sustainable ? "—" : fmtFull(result.totalWithdrawn)}
          </div>
        </div>
      </div>

      {/* Chart */}
      {result.data.length > 1 && (
        <div className="longevity-chart-wrap">
          <div className="longevity-chart-title">Portfolio Value Over Time</div>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={result.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="longevityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff87" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00ff87" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="year"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "DM Mono" }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
                tickFormatter={(v) => `${v}y`}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "DM Mono" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmt(v)}
                width={64}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#00ff87"
                strokeWidth={2}
                fill="url(#longevityGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
