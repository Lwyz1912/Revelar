"use client";

import { useCallback, useEffect, useState } from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastMessage = {
  text: string;
  tone: ToastTone;
};

export type ShowToast = (message: string, tone?: ToastTone) => void;

export function useToast(duration = 2800) {
  const [message, setMessage] = useState<ToastMessage | null>(null);

  const showToast = useCallback<ShowToast>((text, tone = "success") => {
    setMessage({ text, tone });
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), duration);
    return () => window.clearTimeout(timer);
  }, [duration, message]);

  return { message, showToast };
}
