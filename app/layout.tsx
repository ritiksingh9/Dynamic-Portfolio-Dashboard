import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "8Byte Capital Portfolio",
  description: "A live, sector-aware view of your investment portfolio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
