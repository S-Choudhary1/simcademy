
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://simcademy.app"),

  title: {
    default: "Simcademy — Learn System Design by Doing",
    template: "%s | Simcademy",
  },

  description:
    "Simcademy is an interactive academy for system design: learn distributed systems, databases, and backend engineering through browser-based simulations. See how production systems work — explore, modify, and break them safely.",

  keywords: [
    "system design",
    "learn system design",
    "distributed systems",
    "backend engineering",
    "interactive simulator",
    "system design playground",
    "Simcademy",
  ],

  openGraph: {
    title: "Simcademy — Learn System Design by Doing",
    description:
      "An interactive academy for system design. Explore, modify, and break real systems safely.",
    siteName: "Simcademy",
    type: "website",
  },

  // Google Search Console verification
  verification: {
    google: "W2TwZKcGMYRjzmErX8X1L2JJVOEY6L9szQCRQvxVsV4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
