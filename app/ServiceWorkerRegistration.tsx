"use client";

import { useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      );
      if ("caches" in window) {
        void caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("tala-lab-")).map((key) => caches.delete(key))));
      }
      return;
    }

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
