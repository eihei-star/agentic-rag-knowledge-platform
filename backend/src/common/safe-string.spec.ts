import { safeString } from "./safe-string";

describe("safeString", () => {
  it("preserves primitive values", () => {
    expect(safeString("text")).toBe("text");
    expect(safeString(42)).toBe("42");
    expect(safeString(true)).toBe("true");
  });

  it("serializes structured external values", () => {
    expect(safeString({ ok: true })).toBe('{"ok":true}');
  });

  it("uses the fallback for null and circular values", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(safeString(null, "unknown")).toBe("unknown");
    expect(safeString(circular, "unknown")).toBe("unknown");
  });
});
