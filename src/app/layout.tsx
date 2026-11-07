import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Solo Grinding",
  description: "Хичээлийг тоглоом болгох систем",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body className={`${inter.variable} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
