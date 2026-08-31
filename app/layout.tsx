import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIRP · 灰栎村人物层",
  description: "以费伦为背景，验证管理者与独立人物 Agent 对话闭环的 AIRP 原型。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
