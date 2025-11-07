type Tab = {
  id: string;
  label: string;
  href?: string;
};

type TabsProps = {
  tabs: Tab[];
  activeId?: string;
};

export default function Tabs({ tabs, activeId }: TabsProps) {
  if (!tabs.length) return null;
  const current = activeId ?? tabs[0]?.id;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 text-sm font-medium text-zinc-600">
      {tabs.map((tab) => {
        const isActive = tab.id === current;
        const className = isActive
          ? "rounded-full bg-emerald-600 px-4 py-2 text-white shadow"
          : "rounded-full px-4 py-2 text-zinc-500 hover:text-zinc-900";

        return tab.href ? (
          <a key={tab.id} href={tab.href} className={className}>
            {tab.label}
          </a>
        ) : (
          <span key={tab.id} className={className}>
            {tab.label}
          </span>
        );
      })}
    </div>
  );
}
