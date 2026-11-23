import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Departure Mono — SIL Open Font License 1.1, © Helena Zhang (see ./fonts/DepartureMono-OFL.txt)
const pixel = localFont({
  src: "./fonts/DepartureMono-Regular.woff2",
  variable: "--font-pixel",
  display: "block",
});

// Milker — Brandsemut, personal use only (school project; see ./fonts/Milker-LICENSE.txt). The site-wide font; Latin only.
const logo = localFont({
  src: "./fonts/Milker.otf",
  variable: "--font-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Solo Grinding",
  description: "Turn your coursework into a game",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${pixel.variable} ${logo.variable} min-h-screen`}>{children}</body>
    </html>
  );
}
