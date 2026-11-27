"use client";

import { useEffect } from "react";
import Header from "./Header";
import useThemeStore from "@/stores/themeStore";

// The Toaster lives in the root layout; mounting a second one here showed every toast twice.
export default function Layout({ children }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
