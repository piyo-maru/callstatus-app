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
      <head>
        <script src="/config.js"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
