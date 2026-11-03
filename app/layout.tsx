import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plateau Nurse Registry | Demo",
  description: "Local demonstration of a nurse registration and licence verification workflow for Plateau State.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
