import { describe, expect, it } from "vitest";
import {
  ageFromDob,
  formatDate,
  formatDateLong,
  formatFollowUp,
  formatTime,
  formatTimeRange,
  pluralize,
  statusTone,
} from "../utils/format";

describe("format utilities", () => {
  it("formats dates and times for the interface", () => {
    expect(formatDate("2026-10-29")).toBe("29 Oct 2026");
    expect(formatDateLong("2026-10-29")).toBe("Thursday 29 October 2026");
    expect(formatTime("09:30")).toBe("9:30 AM");
    expect(formatTimeRange("09:00", "11:00")).toBe("9:00 AM to 11:00 AM");
  });

  it("handles missing values with clear fallbacks", () => {
    expect(formatDate(null)).toBe("Not recorded");
    expect(formatTime(undefined)).toBe("Not recorded");
    expect(formatFollowUp(null)).toBe("No follow up date set");
    expect(formatFollowUp("2026-11-05")).toBe("Follow up on 05 Nov 2026");
  });

  it("calculates age from a date of birth", () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 30;
    expect(ageFromDob(`${birthYear}-01-01`)).toBe(30);
    expect(ageFromDob(null)).toBeNull();
  });

  it("pluralizes counts and maps status tones", () => {
    expect(pluralize(1, "test")).toBe("test");
    expect(pluralize(2, "test")).toBe("tests");
    expect(pluralize(0, "visit")).toBe("visits");
    expect(statusTone("Booked")).toContain("sky");
    expect(statusTone("Completed")).toContain("emerald");
    expect(statusTone("Cancelled")).toContain("rose");
    expect(statusTone("Unknown")).toContain("slate");
  });
});
