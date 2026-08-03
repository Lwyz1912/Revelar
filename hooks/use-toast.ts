"use client";

import { useEffect, useState } from "react";

export function useToast(duration = 2800) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), duration);
    return () => window.clearTimeout(timer);
  }, [duration, message]);

  return { message, showToast: setMessage };
}
