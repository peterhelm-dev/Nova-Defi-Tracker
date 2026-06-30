import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePersistedState } from "./usePersistedState";

describe("usePersistedState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns the fallback when nothing is persisted", () => {
    const { result } = renderHook(() =>
      usePersistedState("test:key-a", { count: 0 }),
    );
    expect(result.current[0]).toEqual({ count: 0 });
  });

  it("persists writes to localStorage and reflects them in state", () => {
    const { result } = renderHook(() => usePersistedState("test:key-b", 0));

    act(() => {
      result.current[1](5);
    });

    expect(result.current[0]).toBe(5);
    expect(JSON.parse(window.localStorage.getItem("test:key-b")!)).toBe(5);
  });

  it("supports a functional updater based on previous state", () => {
    const { result } = renderHook(() =>
      usePersistedState<number[]>("test:key-c", []),
    );

    act(() => {
      result.current[1]((prev) => [...prev, 1]);
    });
    act(() => {
      result.current[1]((prev) => [...prev, 2]);
    });

    expect(result.current[0]).toEqual([1, 2]);
  });

  it("shares state across multiple hook instances reading the same key", () => {
    const { result: a } = renderHook(() => usePersistedState("test:key-d", 0));
    const { result: b } = renderHook(() => usePersistedState("test:key-d", 0));

    act(() => {
      a.current[1](42);
    });

    expect(b.current[0]).toBe(42);
  });
});
