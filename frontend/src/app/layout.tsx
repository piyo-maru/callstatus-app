import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CallStatus App",
  description: "コールセンター在席状況",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
