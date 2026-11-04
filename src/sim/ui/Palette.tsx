"use client";

import { componentList, type Category, type ComponentDef } from "../registry";

const CATEGORY_ORDER: Category[] = ["client", "network", "compute", "cache", "data", "messaging"];
const CATEGORY_LABEL: Record<Category, string> = {
  client: "Clients",
  network: "Networking",
  compute: "Compute",
  cache: "Caching",
  data: "Data",
  messaging: "Messaging",
};

/** Left sidebar. Each item is draggable onto the canvas to add a component. */
export function Palette() {
  const all = componentList();
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: all.filter((c) => c.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-800 bg-slate-950/60 p-3 md:flex" data-tour="tour-palette">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">Components</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">Drag onto the canvas to build.</p>
      </div>
      {byCategory.map((group) => (
        <div key={group.cat}>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {CATEGORY_LABEL[group.cat]}
          </h3>
          <div className="flex flex-col gap-1.5">
            {group.items.map((c) => (
              <PaletteItem key={c.type} def={c} />
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function PaletteItem({ def }: { def: ComponentDef }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/simcademy-component", def.type);
        e.dataTransfer.effectAllowed = "move";
      }}
      title={def.description}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 active:cursor-grabbing"
    >
      <span className="text-base">{def.icon}</span>
      <span className="text-[13px] font-medium">{def.label}</span>
    </div>
  );
}
