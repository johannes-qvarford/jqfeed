import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "jqfeed — a quiet feed reader",
  description: "A focused reader for entries from your RSS and Atom feeds.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0c110e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
