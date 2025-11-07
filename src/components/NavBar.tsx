import Link from "next/link";

type NavLink = {
  href: string;
  label: string;
};

type NavBarProps = {
  title?: string;
  links?: NavLink[];
};

export default function NavBar({
  title = "LMS",
  links = [
    { href: "/catalog", label: "Catalog" },
    { href: "/login", label: "Login" },
  ],
}: NavBarProps) {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900">
          {title}
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-zinc-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
