"use client";

import { useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register(`${basePath}/sw.js`, {
          scope: `${basePath || ""}/`,
        });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    void register();
  }, []);

  return null;
}
