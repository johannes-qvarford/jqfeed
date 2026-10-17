import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "jqfeed — a quiet feed reader",
  description: "A focused reader for entries from your RSS and Atom feeds.",
};

export const viewport: Viewport = {
  themeColor: "#f3f1ec",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
