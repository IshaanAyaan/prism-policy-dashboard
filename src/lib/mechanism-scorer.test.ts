import { describe, expect, it } from "vitest";
import {
  buildLawScoreResult,
  emptyLawScoreResult,
} from "./mechanism-scorer";

describe("mechanism scorer utilities", () => {
  it("normalizes ranked model outputs into chart scores", () => {
    const result = buildLawScoreResult("beer tax", [
      { label: "price", score: 0.6 },
      { label: "access", score: 0.2 },
      { label: "enforcement", score: 0.2 },
    ]);

    expect(result.dominant).toBe("price");
    expect(result.scores.price).toBeCloseTo(0.6, 2);
    expect(result.scores.access).toBeCloseTo(0.2, 2);
    expect(result.ranked[0].label).toBe("Price");
  });

  it("preserves enforcement as the dominant mechanism when its score is highest", () => {
    const result = buildLawScoreResult(
      "Retailers face license suspension and compliance checks.",
      [
        { label: "price", score: 0.15 },
        { label: "access", score: 0.2 },
        { label: "enforcement", score: 0.65 },
      ],
    );

    expect(result.dominant).toBe("enforcement");
    expect(result.summary).toContain("enforcement");
  });

  it("returns a zeroed state before the model has been run", () => {
    const result = emptyLawScoreResult("");

    expect(result.scores.price).toBe(0);
    expect(result.scores.access).toBe(0);
    expect(result.scores.enforcement).toBe(0);
  });
});
