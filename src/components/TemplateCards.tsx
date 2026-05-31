import { BookOpen, FileQuestion, Mic2, Network } from "lucide-react";

const templates = [
  { title: "采访稿分析", desc: "提炼观点、金句与主题线索", icon: Mic2 },
  { title: "小说角色关系", desc: "梳理人物、事件和关系变化", icon: Network },
  { title: "论文解读", desc: "快速理解问题、方法与贡献", icon: FileQuestion },
  { title: "播客脚本生成", desc: "把长文改写成对谈脚本", icon: BookOpen }
];

export function TemplateCards() {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 font-semibold text-slate-950">快速模板</h2>
      <div className="grid gap-3">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <button key={template.title} className="rounded-xl border border-slate-100 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon size={18} />
              </div>
              <div className="font-semibold text-slate-900">{template.title}</div>
              <p className="mt-1 text-sm leading-5 text-slate-500">{template.desc}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
