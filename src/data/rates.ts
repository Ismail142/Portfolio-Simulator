/** Single source of truth for withdrawal / yield rate percentages used across tools. */
export const WITHDRAWAL_RATES = [4, 5, 6, 7, 8, 10] as const;

export type WithdrawalRate = (typeof WITHDRAWAL_RATES)[number];

export const RATE_COLORS: Record<number, string> = {
  4: "#00ff87",
  5: "#00d4ff",
  6: "#ffbe0b",
  7: "#ff6b6b",
  8: "#8338ec",
  10: "#ff006e",
};

/** Human-readable list for copy, e.g. "4 / 5 / 6 / 7 / 8 / 10%" */
export const RATES_LABEL = WITHDRAWAL_RATES.map((r) => `${r}`).join(" / ") + "%";
