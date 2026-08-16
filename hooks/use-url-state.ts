"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";

function replaceUrlParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.replaceState(window.history.state, "", next);
}

export function clearUrlParams(...keys: string[]) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  keys.forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function useUrlStringState<T extends string>(
  key: string,
  initialValue: T,
  allowedValues?: readonly T[],
  validate?: (value: string) => boolean,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);
  const allowedKey = allowedValues?.join("\u0000") || "";
  const allowed = useMemo(
    () => (allowedValues ? new Set<T>(allowedValues) : null),
    // The serialized list keeps callers free to pass a literal array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowedKey],
  );

  useEffect(() => {
    const read = () => {
      const raw = new URL(window.location.href).searchParams.get(key);
      setValue(
        raw !== null && (!allowed || allowed.has(raw as T)) && (!validate || validate(raw))
          ? (raw as T)
          : initialValue,
      );
    };
    const frame = window.requestAnimationFrame(() => {
      read();
      setReady(true);
    });
    window.addEventListener("popstate", read);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", read);
    };
  }, [allowed, initialValue, key, validate]);

  useEffect(() => {
    if (!ready) return;
    replaceUrlParam(key, value === initialValue ? null : value);
  }, [initialValue, key, ready, value]);

  return [value, setValue];
}

export function useUrlNullableNumberState(
  key: string,
): [number | null, Dispatch<SetStateAction<number | null>>] {
  const [value, setValue] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => {
      const raw = new URL(window.location.href).searchParams.get(key);
      if (!raw) {
        setValue(null);
        return;
      }
      const parsed = Number(raw);
      setValue(Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null);
    };
    const frame = window.requestAnimationFrame(() => {
      read();
      setReady(true);
    });
    window.addEventListener("popstate", read);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", read);
    };
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    replaceUrlParam(key, value === null ? null : String(value));
  }, [key, ready, value]);

  return [value, setValue];
}

export function useUrlBooleanState(key: string): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [raw, setRaw] = useUrlStringState(key, "", ["", "1"] as const);
  return [raw === "1", (next) => setRaw((current) => (resolve(next, current === "1") ? "1" : ""))];
}

function resolve<T>(next: SetStateAction<T>, current: T) {
  return typeof next === "function" ? (next as (value: T) => T)(current) : next;
}
