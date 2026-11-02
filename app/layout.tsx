import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { DbProvider } from "@/components/DbProvider";

export const metadata: Metadata = {
  title: "Gaokao Coach 2027",
  description: "广东 2027 届新高考 AI 学习辅导与进步追踪",
};

const navItems = [
  { href: "/", label: "看板" },
  { href: "/exams", label: "考试" },
  { href: "/wrong-items", label: "错题" },
  { href: "/review", label: "复测" },
  { href: "/vocab", label: "词汇" },
  { href: "/classical", label: "古诗文" },
  { href: "/forecast", label: "预测" },
  { href: "/rewards", label: "评分" },
  { href: "/settings", label: "设置" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <DbProvider>
          <div className="max-w-[980px] mx-auto px-4 py-5 pb-14">
            <header className="pb-4 mb-4 border-b border-line">
              <div className="text-[11px] tracking-[0.16em] text-brand-orange font-extrabold uppercase">
                Gaokao Coach · 2027
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight mt-1.5">
                广东新高考学情管理
              </h1>
              <p className="text-muted text-sm mt-1">
                物理 / 化学 / 生物 · 目标 480 / 挑战 550
              </p>
            </header>
            <nav className="sticky top-0 z-10 bg-bg/90 backdrop-blur py-2 flex gap-1.5 overflow-x-auto mb-5 -mx-1 px-1">
              {navItems.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex-none px-3 py-1.5 rounded-full border border-line bg-paper text-[11px] text-[#625e56] hover:bg-[#fff0d7] transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <main>{children}</main>
            <footer className="mt-8 pt-4 border-t border-line text-[11px] text-muted">
              数据本地存储（IndexedDB）· 可在「设置」导出 JSON 备份 · 不构成高考成绩承诺
            </footer>
          </div>
        </DbProvider>
      </body>
    </html>
  );
}
