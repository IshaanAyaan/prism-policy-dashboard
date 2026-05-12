import blogWeeksJson from "@/data/generated/blog-weeks.json";
import crashModelsJson from "@/data/generated/crash-model-comparison.json";
import eventStudyJson from "@/data/generated/event-study.json";
import headlineMetricsJson from "@/data/generated/headline-metrics.json";
import mechanismContributionsJson from "@/data/generated/mechanism-contributions.json";
import mechanismModelsJson from "@/data/generated/mechanism-model-comparison.json";
import scenarioForecastsJson from "@/data/generated/scenario-forecasts.json";
import stateSeriesJson from "@/data/generated/state-series.json";

export const BLOG_URL = "https://basisseniorprojects.com/author/ishaan-r-2026/";
export const COHORT_URL = "https://basisseniorprojects.com/peoria-2026/";
export const GITHUB_REPO_NAME = "prism-policy-dashboard";

export type MechanismKey = "price" | "access" | "enforcement";

export type MechanismScores = Record<MechanismKey, number>;

export type StateYearRow = {
  state_abbrev: string;
  state_name: string;
  year: number;
  rate_impaired_per100k: number | null;
  rate_alcohol_involved_per100k: number | null;
  beer_tax_usd_per_gallon: number | null;
  vmt_per_capita: number | null;
  unemployment_rate: number | null;
  mech_v3_price_score: number | null;
  mech_v3_access_score: number | null;
  mech_v3_enforcement_score: number | null;
  coverage_provenance: string | null;
  observed_text_flag: boolean | null;
  text_quality_score: number | null;
  selected_chunk_count: number | null;
  source_count: number | null;
  observed_flag_teen: boolean | null;
  imputed_flag_teen: boolean | null;
  forecast_interval_low: number | null;
  forecast_interval_high: number | null;
};

export type ScenarioForecast = {
  state_abbrev: string;
  year: number;
  scenario_name: string;
  forecast_baseline: number;
  forecast_scenario: number;
  delta: number;
  forecast_interval_low: number;
  forecast_interval_high: number;
};

export type MechanismContribution = ScenarioForecast & {
  contrib_price: number;
  contrib_access: number;
  contrib_enforcement: number;
  contrib_other: number;
};

export type HeadlineMetric = {
  metric: string;
  value: number | string;
  display: string;
  note: string;
};

export type CrashModelRow = {
  model: string;
  val_rmse: number;
  test_rmse: number;
  test_mae: number;
  test_r2: number;
  n_train: number;
  n_val: number;
  n_test: number;
};

export type MechanismModelRow = {
  model: string;
  macro_f1: number | string | null;
  f1_access: number | string | null;
  f1_enforcement: number | string | null;
  f1_price: number | string | null;
  selected_model?: string;
};

export type EventStudyRow = {
  event_time: number;
  coef: number | string;
  ci_low: number | string;
  ci_high: number | string;
  pretrend_pvalue?: number | string;
};

export type ScenarioInputs = {
  state: string;
  beerTaxDelta: number;
  accessShift: number;
  enforcementShift: number;
};

export type ScenarioResult = {
  baseline: number;
  scenario: number;
  delta: number;
  intervalLow: number;
  intervalHigh: number;
  contributions: {
    price: number;
    access: number;
    enforcement: number;
  };
};

export type BlogWeek = {
  week: number;
  title: string;
  focus: string;
};

const stateSeries = stateSeriesJson as StateYearRow[];
const scenarioForecasts = scenarioForecastsJson as ScenarioForecast[];
const mechanismContributions =
  mechanismContributionsJson as MechanismContribution[];

export const blogWeeks = blogWeeksJson as BlogWeek[];
export const headlineMetrics = headlineMetricsJson as HeadlineMetric[];
export const crashModels = (crashModelsJson as CrashModelRow[]).map((row) => ({
  ...row,
  test_rmse: numeric(row.test_rmse),
  test_mae: numeric(row.test_mae),
  test_r2: numeric(row.test_r2),
}));
export const mechanismModels = mechanismModelsJson as MechanismModelRow[];

export const eventStudy = (eventStudyJson as EventStudyRow[]).map((row) => ({
  event_time: numeric(row.event_time),
  coef: numeric(row.coef),
  ci_low: numeric(row.ci_low),
  ci_high: numeric(row.ci_high),
  pretrend_pvalue: numeric(row.pretrend_pvalue ?? 0),
}));

export const states = Array.from(
  new Map(
    stateSeries.map((row) => [
      row.state_abbrev,
      { abbrev: row.state_abbrev, name: row.state_name },
    ]),
  ).values(),
).sort((a, b) => a.name.localeCompare(b.name));

export const baselineYears = Array.from(
  new Set(stateSeries.map((row) => row.year)),
).sort((a, b) => b - a);

export const headline = {
  macroF1: metricDisplay("mechanism_macro_f1", "0.962"),
  rmse: metricDisplay("best_crash_rmse", "0.863"),
  r2: metricDisplay("best_crash_r2", "0.454"),
  causalPost: metricDisplay("causal_avg_post_coef", "-0.379"),
  pretrendP: metricDisplay("causal_pretrend_p", "0.095"),
};

export function getStateSeries(state: string) {
  return stateSeries
    .filter((row) => row.state_abbrev === state)
    .sort((a, b) => a.year - b.year);
}

export function getLatestState(state: string) {
  const rows = getStateSeries(state);
  return rows[rows.length - 1] ?? stateSeries[0];
}

export function getStateYearRow(state: string, year: number) {
  return (
    stateSeries.find(
      (row) => row.state_abbrev === state && numeric(row.year) === numeric(year),
    ) ?? getLatestState(state)
  );
}

export function getStateMechanismScores(state: string): MechanismScores {
  const latest = getLatestState(state);

  return {
    price: clamp01(numeric(latest.mech_v3_price_score)),
    access: clamp01(numeric(latest.mech_v3_access_score)),
    enforcement: clamp01(numeric(latest.mech_v3_enforcement_score)),
  };
}

export function getStateMechanismScoresForYear(
  state: string,
  year: number,
): MechanismScores {
  const row = getStateYearRow(state, year);

  return {
    price: clamp01(numeric(row.mech_v3_price_score)),
    access: clamp01(numeric(row.mech_v3_access_score)),
    enforcement: clamp01(numeric(row.mech_v3_enforcement_score)),
  };
}

export function getScenarioForecast(state: string) {
  return (
    scenarioForecasts.find((row) => row.state_abbrev === state) ??
    scenarioForecasts[0]
  );
}

export function calculateScenario(inputs: ScenarioInputs): ScenarioResult {
  const forecast = getScenarioForecast(inputs.state);
  const contribution =
    mechanismContributions.find((row) => row.state_abbrev === inputs.state) ??
    mechanismContributions[0];

  const price = numeric(contribution.contrib_price) * (inputs.beerTaxDelta / 0.1);
  const access = numeric(contribution.contrib_access) * inputs.accessShift;
  const enforcement =
    numeric(contribution.contrib_enforcement) * inputs.enforcementShift;
  const delta = price + access + enforcement;
  const scenario = Math.max(0, numeric(forecast.forecast_baseline) + delta);
  const intervalHalfWidth =
    Math.abs(numeric(forecast.forecast_interval_high) - numeric(forecast.forecast_interval_low)) /
      2 || 2.5;

  return {
    baseline: numeric(forecast.forecast_baseline),
    scenario,
    delta,
    intervalLow: Math.max(0, scenario - intervalHalfWidth),
    intervalHigh: scenario + intervalHalfWidth,
    contributions: { price, access, enforcement },
  };
}

export function getTopScenarioDeltas(limit = 8) {
  return scenarioForecasts
    .map((row) => ({
      state: row.state_abbrev,
      delta: numeric(row.delta),
      baseline: numeric(row.forecast_baseline),
      scenario: numeric(row.forecast_scenario),
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit);
}

export function formatRate(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }

  return Number(value).toFixed(digits);
}

export function formatSigned(value: number, digits = 3) {
  const rounded = Number(value).toFixed(digits);
  return value > 0 ? `+${rounded}` : rounded;
}

export function axisPercent(value: number) {
  return `${Math.round(clamp01(value) * 100)}%`;
}

export function numeric(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metricDisplay(metric: string, fallback: string) {
  return (
    headlineMetrics.find((row) => row.metric === metric)?.display ?? fallback
  );
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
