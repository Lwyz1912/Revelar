"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

import { readJson, readText, writeJson, writeText } from "@/lib/storage";

type PersistentState<T> = [T, Dispatch<SetStateAction<T>>];

const storageEventName = "revelar:storage-change";

function notifyStorageChange(key: string) {
  window.dispatchEvent(new CustomEvent(storageEventName, { detail: key }));
}

function useStoredRawValue(key: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleCustomChange = (event: Event) => {
        if ((event as CustomEvent<string>).detail === key) onStoreChange();
      };
      const handleNativeChange = (event: StorageEvent) => {
        if (event.key === key) onStoreChange();
      };

      window.addEventListener(storageEventName, handleCustomChange);
      window.addEventListener("storage", handleNativeChange);

      return () => {
        window.removeEventListener(storageEventName, handleCustomChange);
        window.removeEventListener("storage", handleNativeChange);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => window.localStorage.getItem(key), [key]);
  const getServerSnapshot = useCallback(() => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useStoredJsonState<T>(key: string, initialValue: T): PersistentState<T> {
  const rawValue = useStoredRawValue(key);
  const value = useMemo(() => {
    if (rawValue === null) return initialValue;

    return readJson({ getItem: () => rawValue, setItem: () => undefined }, key, initialValue);
  }, [initialValue, key, rawValue]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (update) => {
      const currentValue = readJson(window.localStorage, key, initialValue);
      const nextValue =
        typeof update === "function" ? (update as (current: T) => T)(currentValue) : update;

      writeJson(window.localStorage, key, nextValue);
      notifyStorageChange(key);
    },
    [initialValue, key],
  );

  return [value, setValue];
}

export function useStoredTextState<T extends string>(
  key: string,
  initialValue: T,
  allowed: readonly T[],
): PersistentState<T> {
  const rawValue = useStoredRawValue(key);
  const allowedValues = useMemo(() => new Set(allowed), [allowed]);
  const value = useMemo(() => {
    if (rawValue === null || !allowedValues.has(rawValue as T)) return initialValue;
    return rawValue as T;
  }, [allowedValues, initialValue, rawValue]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (update) => {
      const currentValue = readText(window.localStorage, key, initialValue, allowed);
      const nextValue =
        typeof update === "function" ? (update as (current: T) => T)(currentValue) : update;

      writeText(window.localStorage, key, nextValue);
      notifyStorageChange(key);
    },
    [allowed, initialValue, key],
  );

  return [value, setValue];
}
