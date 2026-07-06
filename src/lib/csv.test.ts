import { describe, expect, it } from "vitest";
import { csvFilename, toCsv } from "./csv";

describe("toCsv", () => {
  it("joins headers and rows with CRLF", () => {
    expect(toCsv(["a", "b"], [["1", "2"], ["3", "4"]])).toBe(
      "a,b\r\n1,2\r\n3,4",
    );
  });

  it("quotes cells containing commas, quotes, or newlines", () => {
    expect(toCsv(["v"], [["hello, world"]])).toBe('v\r\n"hello, world"');
    expect(toCsv(["v"], [['say "hi"']])).toBe('v\r\n"say ""hi"""');
    expect(toCsv(["v"], [["line1\nline2"]])).toBe('v\r\n"line1\nline2"');
  });

  it("renders numbers plainly and null/undefined as empty", () => {
    expect(toCsv(["a", "b", "c"], [[1234.5, null, undefined]])).toBe(
      "a,b,c\r\n1234.5,,",
    );
  });
});

describe("csvFilename", () => {
  it("appends the ISO date and .csv", () => {
    expect(csvFilename("holdings", new Date("2026-07-02T15:00:00Z"))).toBe(
      "holdings-2026-07-02.csv",
    );
  });
});
