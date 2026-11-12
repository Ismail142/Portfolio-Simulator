# Finance Tools

A collection of client-side portfolio and retirement planning tools. Model how long your money lasts, project growth with contributions, estimate sustainable income, and explore historical market returns.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Recharts

---

## Tools

### Planners

| Tool | Description |
|------|-------------|
| **Portfolio Longevity** | Enter portfolio value, expected annual return, and monthly withdrawal. See how many years the portfolio will last, with a depletion chart. |
| **Compound Growth** | Project investment growth with regular contributions (weekly / monthly / quarterly / annually). |
| **Retirement Drawdown** | Solve for the monthly withdrawal that depletes the portfolio at a chosen life expectancy. |
| **Yield Calculator** | Estimate monthly and annual income at 4–8% yields. Dual currency (USD & GHS). |
| **Dynamic Withdrawal** | Backtest fixed withdrawal rates against real S&P 500 returns (1926–present). |

### Markets

| Tool | Description |
|------|-------------|
| **S&P 500 Returns** | Rolling CAGRs, return distributions, and best / median / worst windows. |
| **Crypto Returns** | Bitcoin annual returns — rolling windows and extreme periods. |
| **USD/GHS Returns** | Exchange-rate annual returns — rolling windows and extremes. |

---

## Getting started

```bash
# Install dependencies (npm or bun)
npm install
# or
bun install

# Start dev server
npm run dev
# or
bun dev
```

App runs at [http://localhost:5000](http://localhost:5000).

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

---

## Project structure

```
src/
├── App.tsx                 # Shell, navigation, page routing
├── PortfolioLongevity.tsx  # How long will the portfolio last?
├── CompoundGrowth.tsx
├── RetirementDrawdown.tsx
├── PortfolioYield.tsx
├── DynamicWithdrawal.tsx
├── SP500Returns.tsx
├── CryptoReturns.tsx
├── UsdGhsReturns.tsx
├── data/
│   ├── historicalReturns.ts  # S&P 500 annual total returns
│   ├── bitcoinReturns.ts
│   └── usdghsReturns.ts
├── components/ui/            # shadcn-style Radix primitives
└── styles.css
```

All calculations run in the browser. Inputs are persisted to `localStorage` per tool.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## Notes

- Dark theme by default.
- No backend or API keys required.
- Historical data is static and embedded under `src/data/`.
