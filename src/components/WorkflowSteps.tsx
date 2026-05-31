import { Check, FileUp, Loader2, PanelsTopLeft } from "lucide-react";

const steps = [
  { label: "上传", icon: FileUp },
  { label: "解析", icon: Loader2 },
  { label: "生成工作台", icon: PanelsTopLeft }
];

export function WorkflowSteps() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 ring-1 ring-slate-200">
                {index === 0 ? <Check size={17} /> : <Icon size={17} />}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{step.label}</div>
                <div className="text-xs text-slate-500">{index === 0 ? "选择文件" : index === 1 ? "提取文本" : "生成视图"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
