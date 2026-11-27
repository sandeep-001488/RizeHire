import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Layout from "@/components/layout/Layout";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans-app" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display-app",
});

export const metadata = {
  title: "RizeHire - AI-Powered Job Platform",
  description: "AI-powered job matching for job seekers and recruiters",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}>
        <Layout>{children}</Layout>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
