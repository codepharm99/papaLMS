import Link from "next/link";

type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="breadcrumbs" className="mb-4 text-sm text-gray-600">
      {items.map((c, i) => (
        <span key={i}>
          {c.href ? (
            <Link href={c.href} className="hover:underline">
              {c.label}
            </Link>
          ) : (
            <span className="text-gray-800">{c.label}</span>
          )}
          {i < items.length - 1 && <span className="mx-2 text-gray-400">›</span>}
        </span>
      ))}
    </nav>
  );
}

