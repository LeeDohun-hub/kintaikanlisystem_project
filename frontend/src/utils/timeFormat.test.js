import { describe, expect, it } from "vitest";
import { formatMinutesAsHm, parseHmToMinutes } from "./timeFormat";

describe("timeFormat", () => {
  it("formatMinutesAsHm formats minutes to H:MM", () => {
    expect(formatMinutesAsHm(0)).toBe("0:00");
    expect(formatMinutesAsHm(60)).toBe("1:00");
    expect(formatMinutesAsHm(90)).toBe("1:30");
    expect(formatMinutesAsHm(24 * 60 + 5)).toBe("24:05");
  });

  it("parseHmToMinutes parses H:MM", () => {
    expect(parseHmToMinutes("1:00")).toBe(60);
    expect(parseHmToMinutes("01:30")).toBe(90);
    expect(parseHmToMinutes("24:00")).toBe(1440);
  });

  it("parseHmToMinutes returns NaN for invalid format", () => {
    expect(Number.isNaN(parseHmToMinutes("1:0"))).toBe(true);
    expect(Number.isNaN(parseHmToMinutes("1:60"))).toBe(true);
    expect(Number.isNaN(parseHmToMinutes("abc"))).toBe(true);
  });
});
