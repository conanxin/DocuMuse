"use client";

import { Bell, Search, Sparkles } from "lucide-react";
import { ApiSettingsDialog } from "./ApiSettingsDialog";
import { useState } from "react";

export function AppHeader() {
  const [apiOpen, setApiOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-950">DocuMuse</div>
              <div className="text-xs text-slate-500">AI 文档阅读工作台</div>
            </div>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">最近文档</button>
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">模板</button>
            <button onClick={() => setApiOpen(true)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              API 设置
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <button aria-label="搜索" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <Search size={19} />
            </button>
            <button aria-label="通知" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <Bell size={19} />
            </button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 ring-2 ring-white" />
          </div>
        </div>
      </header>
      <ApiSettingsDialog open={apiOpen} onClose={() => setApiOpen(false)} />
    </>
  );
}
