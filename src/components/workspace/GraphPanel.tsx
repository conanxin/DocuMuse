"use client";

import { useState } from "react";
import { mockGraphData } from "@/lib/mockData";

export function GraphPanel() {
  const [selectedId, setSelectedId] = useState(mockGraphData[0].id);
  const selected = mockGraphData.find((node) => node.id === selectedId) ?? mockGraphData[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">简化结构图</h2>
        <div className="mt-5 grid gap-4">
          <button
            onClick={() => setSelectedId("center")}
            className={`mx-auto w-full max-w-md rounded-2xl border p-5 text-center transition ${selectedId === "center" ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
          >
            <div className="text-xs font-medium text-blue-600">中心主题</div>
            <div className="mt-2 text-lg font-bold text-slate-950">AI 文档阅读工作台</div>
          </button>
          <div className="grid gap-3 md:grid-cols-2">
            {mockGraphData.filter((node) => node.id !== "center").map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedId(node.id)}
                className={`rounded-xl border p-4 text-left transition ${selectedId === node.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-200"}`}
              >
                <div className="text-xs font-medium text-slate-500">{node.type}</div>
                <div className="mt-2 font-semibold text-slate-950">{node.label}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{node.summary}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-xl bg-blue-50 p-4">
          <div className="text-xs font-semibold text-blue-700">{selected.type}</div>
          <h3 className="mt-2 text-lg font-bold text-slate-950">{selected.label}</h3>
        </div>
        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="font-semibold text-slate-900">摘要</dt>
            <dd className="mt-1 leading-6 text-slate-600">{selected.summary}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">引用来源</dt>
            <dd className="mt-1 text-slate-600">{selected.source}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">相关段落</dt>
            <dd className="mt-1 text-slate-600">{selected.related}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">图片生成提示词</dt>
            <dd className="mt-1 rounded-lg bg-slate-50 p-3 leading-6 text-slate-600">{selected.prompt}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
