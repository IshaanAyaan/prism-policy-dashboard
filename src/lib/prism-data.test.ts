import { describe, expect, it } from "vitest";
import {
  calculateScenario,
  getStateMechanismScores,
  states,
} from "./prism-data";

describe("PRISM scenario utilities", () => {
  it("loads the state list from curated data", () => {
    expect(states.length).toBeGreaterThanOrEqual(51);
    expect(states.some((state) => state.abbrev === "AZ")).toBe(true);
  });

  it("calculates a repeatable scenario from slider inputs", () => {
    const first = calculateScenario({
      state: "AZ",
      beerTaxDelta: 0.1,
      accessShift: 0,
      enforcementShift: 1,
    });
    const second = calculateScenario({
      state: "AZ",
      beerTaxDelta: 0.1,
      accessShift: 0,
      enforcementShift: 1,
    });

    expect(first).toEqual(second);
    expect(first.baseline).toBeGreaterThan(0);
    expect(first.intervalHigh).toBeGreaterThan(first.intervalLow);
  });

  it("normalizes mechanism profile values to the chart range", () => {
    const scores = getStateMechanismScores("AZ");

    expect(scores.price).toBeGreaterThanOrEqual(0);
    expect(scores.price).toBeLessThanOrEqual(1);
    expect(scores.access).toBeGreaterThanOrEqual(0);
    expect(scores.access).toBeLessThanOrEqual(1);
    expect(scores.enforcement).toBeGreaterThanOrEqual(0);
    expect(scores.enforcement).toBeLessThanOrEqual(1);
  });
});
