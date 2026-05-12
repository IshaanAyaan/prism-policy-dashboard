import { describe, expect, it } from "vitest";
import { scoreLawText } from "./mechanism-scorer";

describe("scoreLawText", () => {
  it("detects price-heavy beer tax language", () => {
    const result = scoreLawText(
      "The state raises the beer excise tax by ten cents per gallon.",
    );

    expect(result.dominant).toBe("price");
    expect(result.scores.price).toBeGreaterThan(result.scores.access);
    expect(result.evidence.price).toContain("alcohol tax");
  });

  it("detects enforcement language around underage purchase penalties", () => {
    const result = scoreLawText(
      "Retailers face license suspension and fines after underage compliance checks.",
    );

    expect(result.dominant).toBe("enforcement");
    expect(result.scores.enforcement).toBeGreaterThan(0.6);
  });

  it("keeps blank text at zero", () => {
    const result = scoreLawText("");

    expect(result.scores.price).toBe(0);
    expect(result.scores.access).toBe(0);
    expect(result.scores.enforcement).toBe(0);
  });
});
