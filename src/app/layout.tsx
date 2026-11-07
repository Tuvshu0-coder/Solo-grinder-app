import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Departure Mono — SIL Open Font License 1.1, © Helena Zhang (see ./fonts/DepartureMono-OFL.txt)
const pixel = localFont({
  src: "./fonts/DepartureMono-Regular.woff2",
  variable: "--font-pixel",
  display: "block",
});

export const metadata: Metadata = {
  title: "Solo Grinding",
  description: "Хичээлийг тоглоом болгох систем",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body className={`${pixel.variable} min-h-screen`}>{children}</body>
    </html>
  );
}
