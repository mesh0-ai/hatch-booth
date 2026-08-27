import { describe, expect, it } from "vitest";
import { cleanCodeInput, describeDuration, groupCode } from "../src/lib/format.js";

describe("describeDuration", () => {
  it("reads out in seconds under a minute", () => {
    expect(describeDuration(45_000)).toBe("45s");
  });

  it("reads out in minutes and seconds above one", () => {
    expect(describeDuration(184_000)).toBe("3m 4s");
  });

  it("drops the seconds when there are none", () => {
    expect(describeDuration(120_000)).toBe("2m");
  });

  it("rounds rather than truncating", () => {
    // The sentence this feeds is "about three minutes"; a value that reads
    // one second low for no reason is worse than one that rounds.
    expect(describeDuration(44_600)).toBe("45s");
  });

  it("handles zero", () => {
    expect(describeDuration(0)).toBe("0s");
  });
});

describe("groupCode", () => {
  it("groups a booth code the way the SMS does", () => {
    expect(groupCode("K7QM2X")).toBe("K7Q-M2X");
  });

  it("splits an odd length without losing a character", () => {
    expect(groupCode("ABCDE").replace("-", "")).toBe("ABCDE");
  });
});

describe("cleanCodeInput", () => {
  it("uppercases", () => {
    expect(cleanCodeInput("k7qm2x")).toBe("K7QM2X");
  });

  it("drops the separator the SMS carries", () => {
    expect(cleanCodeInput("K7Q-M2X")).toBe("K7QM2X");
  });

  it("drops spaces from a code read aloud", () => {
    expect(cleanCodeInput(" K7Q M2X ")).toBe("K7QM2X");
  });

  it("drops the characters the alphabet excludes", () => {
    // I, L, O, U, 0 and 1 are excluded precisely because they get misheard;
    // keeping one would turn a recoverable mishearing into a lookup miss.
    expect(cleanCodeInput("K7QM2XOLIU01")).toBe("K7QM2X");
  });

  it("stops at twelve, the longest code Hatch accepts", () => {
    expect(cleanCodeInput("K7QM2XPA9RTVK7QM2X")).toHaveLength(12);
  });

  it("leaves a clean code alone", () => {
    expect(cleanCodeInput("K7QM2XPA9RTV")).toBe("K7QM2XPA9RTV");
  });
});
