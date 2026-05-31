"use client";

import { useState } from "react";
import { mockCreativeOutputs, type CreativeStatus } from "@/lib/mockData";
import { OutputCard } from "./OutputCard";

export function CreativeOutputsPanel() {
  const [outputs, setOutputs] = useState(mockCreativeOutputs);

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
