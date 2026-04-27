import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/Context/AppContext";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "AURORA AI — Bias Governance Platform",
  description: "Detect, explain, and mitigate bias in AI systems",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider>
          <Navbar />
          <main style={{ minHeight: "calc(100vh - 64px)" }}>
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
