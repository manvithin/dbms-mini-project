import { describe, expect, it } from "vitest";

import { reasonGuidanceFor, reasonMismatch } from "./reasonGuidance";

describe("reason guidance", () => {
  it("returns guidance for a known specialty", () => {
    const guidance = reasonGuidanceFor("Dermatology");
    expect(guidance?.topic).toContain("skin");
    expect(reasonGuidanceFor("General Medicine")).toBeNull();
    expect(reasonGuidanceFor(null)).toBeNull();
  });

  it("accepts a reason that matches the selected specialty", () => {
    expect(reasonMismatch("Ear Nose and Throat", "Hearing loss for two weeks")).toBeNull();
    expect(reasonMismatch("Cardiology", "High blood pressure review")).toBeNull();
  });

  it("rejects a reason that clearly belongs to another specialty", () => {
    const message = reasonMismatch("Ear Nose and Throat", "Acne and hair loss");
    expect(message).toContain("Dermatology");
    expect(message).toContain("Ear Nose and Throat");
  });

  it("does not match a short word inside a longer word", () => {
    expect(reasonMismatch("Ear Nose and Throat", "Heart check")).not.toBeNull();
    expect(reasonMismatch("Ear Nose and Throat", "Hearing review")).toBeNull();
  });

  it("accepts any reason for a department without a rule", () => {
    expect(reasonMismatch("General Medicine", "Skin rash and hair loss")).toBeNull();
    expect(reasonMismatch(null, "Acne")).toBeNull();
  });
});
