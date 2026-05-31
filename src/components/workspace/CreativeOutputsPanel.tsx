"use client";

import { useState } from "react";
import { mockCreativeOutputs, type CreativeStatus } from "@/lib/mockData";
import type { DocumentAnalysis } from "@/lib/documentTypes";
import { OutputCard } from "./OutputCard";

export function CreativeOutputsPanel({ analysis }: { analysis?: DocumentAnalysis }) {
  const [outputs, setOutputs] = useState(mockCreativeOutputs);

  if (analysis?.pptOutline?.length || analysis?.podcastScript || analysis?.imagePrompts?.length) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {analysis.pptOutline?.length && (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-950">PPT 大纲</h3>
            <div className="mt-4 space-y-4">
              {analysis.pptOutline.map((slide, index) => (
                <div key={`${slide.title}-${index}`} className="rounded-xl bg-slate-50 p-4">
                  <h4 className="font-semibold text-slate-900">{slide.title}</h4>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {slide.bullets.map((bullet) => (
                      <li key={bullet}>· {bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        )}
        {analysis.podcastScript && (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-950">播客脚本</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{analysis.podcastScript}</p>
          </article>
        )}
        {analysis.imagePrompts?.length && (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h3 className="font-bold text-slate-950">图片提示词</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {analysis.imagePrompts.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-xl bg-blue-50 p-4">
                  <h4 className="font-semibold text-slate-900">{item.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.prompt}</p>
                </div>
              ))}
            </div>
          </article>
        )}
      </div>
    );
  }

  const regenerate = (id: string) => {
    setOutputs((current) => current.map((item) => (item.id === id ? { ...item, status: "生成中" as CreativeStatus } : item)));
    window.setTimeout(() => {
      setOutputs((current) => current.map((item) => (item.id === id ? { ...item, status: "已生成" as CreativeStatus, preview: `${item.title} 已重新生成，可查看、复制或导出。` } : item)));
    }, 900);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {outputs.map((output) => (
        <OutputCard key={output.id} title={output.title} status={output.status} preview={output.preview} onRegenerate={() => regenerate(output.id)} />
      ))}
    </div>
  );
}
