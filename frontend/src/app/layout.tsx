import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import ConfigLoader from "./components/ConfigLoader";

export const metadata: Metadata = {
  title: "出社状況管理ボード",
  description: "スタッフの出社・勤務状況管理システム",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <ConfigLoader />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
