"use client";

import { useEffect } from "react";
import Header from "./Header";
import useThemeStore from "@/stores/themeStore";
import { Toaster } from "@/components/ui/sonner"; 

export default function Layout({ children }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">{children}</main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
