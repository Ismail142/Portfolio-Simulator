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

const STORAGE_KEY = "required-capital-inputs";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1000
      ? `$${(n / 1000).toFixed(2)}K`
      : `$${n.toFixed(2)}`;

const fmtFull = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type Point = { year: number; value: number };

function requiredCapital(
  monthlyWithdrawal: number,
  annualReturn: number,
  years: number | null,
): { capital: number; perpetual: boolean; data: Point[] } {
  if (monthlyWithdrawal <= 0) {
    return { capital: 0, perpetual: true, data: [] };
  }

  const monthlyRate = annualReturn / 100 / 12;

  // Perpetual: capital that generates exactly the withdrawal from returns
  if (years == null || years <= 0 || !isFinite(years)) {
    if (monthlyRate <= 0) {
      return { capital: Infinity, perpetual: true, data: [] };
    }
    const capital = monthlyWithdrawal / monthlyRate;
    // Project a flat-ish line for display (principal preserved)
    const data: Point[] = [];
    for (let y = 0; y <= 30; y++) {
      data.push({ year: y, value: Math.round(capital * 100) / 100 });
    }
    return { capital, perpetual: true, data };
  }

  // Finite horizon: present value of an annuity (grow-then-withdraw, depletes to 0)
  const months = Math.round(years * 12);
  if (monthlyRate === 0) {
    const capital = monthlyWithdrawal * months;
    const data: Point[] = [];
    let value = capital;
    for (let m = 0; m <= months; m++) {
      if (m % 12 === 0 || m === months) {
        data.push({ year: m / 12, value: Math.max(0, Math.round(value * 100) / 100) });
      }
      value -= monthlyWithdrawal;
    }
    return { capital, perpetual: false, data };
  }

  const capital =
    monthlyWithdrawal * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate;

  // Simulate path for the chart
  const data: Point[] = [];
  let value = capital;
  for (let m = 0; m <= months; m++) {
    if (m % 12 === 0 || m === months) {
      data.push({ year: m / 12, value: Math.max(0, Math.round(value * 100) / 100) });
    }
    if (m < months) {
      value = value * (1 + monthlyRate) - monthlyWithdrawal;
    }
  }
  return { capital, perpetual: false, data };
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

export default function RequiredCapital() {
  const [draftWithdrawal, setDraftWithdrawal] = useState<number | "">(2500);
  const [draftReturn, setDraftReturn] = useState<number | "">(7);
  const [draftYears, setDraftYears] = useState<number | "">("");

  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState(2500);
  const [annualReturn, setAnnualReturn] = useState(7);
  const [years, setYears] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        monthlyWithdrawal?: number;
        annualReturn?: number;
        years?: number | null;
      };
      const w = Math.max(0, Number(saved.monthlyWithdrawal) || 0);
      const r = Number(saved.annualReturn) ?? 7;
      const y = saved.years == null || saved.years === "" ? null : Math.max(0, Number(saved.years) || 0);
      setDraftWithdrawal(w);
      setDraftReturn(r);
      setDraftYears(y ?? "");
      setMonthlyWithdrawal(w);
      setAnnualReturn(r);
      setYears(y);
    } catch {
      /* ignore */
    }
  }, []);

  const isDirty =
    Number(draftWithdrawal) !== monthlyWithdrawal ||
    Number(draftReturn) !== annualReturn ||
    (draftYears === "" ? years !== null : Number(draftYears) !== years);

  const handleCalculate = () => {
    const w = Math.max(0, Number(draftWithdrawal) || 0);
    const r = Number(draftReturn) || 0;
    const yRaw = draftYears === "" ? null : Math.max(0, Number(draftYears) || 0);
    setDraftWithdrawal(w);
    setDraftReturn(r);
    setDraftYears(yRaw ?? "");
    setMonthlyWithdrawal(w);
    setAnnualReturn(r);
    setYears(yRaw);
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ monthlyWithdrawal: w, annualReturn: r, years: yRaw }),
      );
    } catch {
      /* ignore */
    }
  };

  const result = useMemo(
    () => requiredCapital(monthlyWithdrawal, annualReturn, years),
    [monthlyWithdrawal, annualReturn, years],
  );

  const capitalLabel =
    !isFinite(result.capital) || result.capital === Infinity
      ? "∞"
      : fmtFull(result.capital);

  const statusText = result.perpetual
    ? "Supports the withdrawal forever (principal preserved)"
    : `Supports the withdrawal for ${years} year${years !== 1 ? "s" : ""} then depletes to zero`;

  return (
    <>
      <style>{`
        .req-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .req-result {
          background: linear-gradient(135deg, rgba(0,255,135,0.08), rgba(0,212,255,0.05));
          border: 1px solid rgba(0,255,135,0.2);
          border-radius: 12px;
          padding: 24px 28px;
          margin-bottom: 20px;
        }
        .req-result-label {
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          margin-bottom: 6px;
        }
        .req-result-value {
          font-size: 36px;
          font-weight: 600;
          font-family: "DM Mono", monospace;
          color: #00ff87;
          line-height: 1.1;
        }
        .req-result-sub {
          margin-top: 8px;
          font-size: 14px;
          color: rgba(255,255,255,0.65);
        }
        .req-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .req-stat {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 14px 16px;
        }
        .req-stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          margin-bottom: 4px;
        }
        .req-stat-value {
          font-size: 18px;
          font-family: "DM Mono", monospace;
          color: #fff;
        }
        .req-chart-wrap {
          height: 320px;
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          padding: 12px 8px 4px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .req-chart-title {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          margin: 0 12px 8px;
        }
      `}</style>

      <div className="req-grid">
        <div className="stat-card slider-wrap">
          <div className="slider-label">
            Desired monthly withdrawal
            <span className="slider-val">
              {draftWithdrawal === "" ? "—" : fmtFull(Number(draftWithdrawal) || 0)}
            </span>
          </div>
          <input
            className="num-input"
            type="number"
            min={0}
            step={100}
            value={draftWithdrawal}
            onChange={(e) => setDraftWithdrawal(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="2500"
          />
        </div>

        <div className="stat-card slider-wrap">
          <div className="slider-label">
            Expected annual return
            <span className="slider-val">{draftReturn === "" ? "—" : `${draftReturn}%`}</span>
          </div>
          <input
            className="num-input"
            type="number"
            step={0.1}
            value={draftReturn}
            onChange={(e) => setDraftReturn(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="7"
          />
        </div>

        <div className="stat-card slider-wrap">
          <div className="slider-label">
            Time horizon (years)
            <span className="slider-val">{draftYears === "" ? "Perpetual" : `${draftYears}y`}</span>
          </div>
          <input
            className="num-input"
            type="number"
            min={0}
            step={1}
            value={draftYears}
            onChange={(e) => setDraftYears(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Empty = forever"
          />
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <button
          className="calc-btn"
          onClick={handleCalculate}
          disabled={!isDirty}
        >
          Calculate
        </button>
      </div>

      <div className="req-result">
        <div className="req-result-label">Required starting capital</div>
        <div className="req-result-value">{capitalLabel}</div>
        <div className="req-result-sub">{statusText}</div>
      </div>

      <div className="req-stats">
        <div className="req-stat">
          <div className="req-stat-label">Monthly withdrawal</div>
          <div className="req-stat-value">{fmtFull(monthlyWithdrawal)}</div>
        </div>
        <div className="req-stat">
          <div className="req-stat-label">Annual withdrawal</div>
          <div className="req-stat-value">{fmtFull(monthlyWithdrawal * 12)}</div>
        </div>
        <div className="req-stat">
          <div className="req-stat-label">Expected return</div>
          <div className="req-stat-value">{annualReturn}%</div>
        </div>
        <div className="req-stat">
          <div className="req-stat-label">Horizon</div>
          <div className="req-stat-value">{years == null ? "Forever" : `${years} years`}</div>
        </div>
      </div>

      {result.data.length > 1 && isFinite(result.capital) && (
        <div className="req-chart-wrap">
          <div className="req-chart-title">
            {result.perpetual ? "Principal preserved indefinitely" : "Portfolio path to depletion"}
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={result.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#reqGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
