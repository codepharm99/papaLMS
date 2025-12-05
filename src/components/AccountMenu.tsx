"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User, Book } from "lucide-react";

type UserShort = { id: string; name?: string; role?: string } | null;

export default function AccountMenu({ user }: { user: UserShort }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const initials = (() => {
    const n = user?.name ?? "";
    if (!n) return "?";
    return n
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  })();

  async function doLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // ignore
    }
    router.push("/login");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-800 hover:ring-2 hover:ring-offset-2 hover:ring-gray-200"
        title={user?.name ?? "Акаунт"}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md border bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="p-2">
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <User className="h-4 w-4 text-gray-500" />
              Профиль
            </Link>
            <Link href="/profile/settings" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Settings className="h-4 w-4 text-gray-500" />
              Настройки
            </Link>
            <Link
              href={user?.role === "TEACHER" ? "/teacher/courses" : "/student/courses"}
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Book className="h-4 w-4 text-gray-500" />
              Мои курсы
            </Link>
          </div>
          <div className="p-2">
            <button
              onClick={doLogout}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-red-600 hover:bg-red-50"
              title="Выйти"
            >
              <LogOut className="h-4 w-4 text-red-600" />
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
