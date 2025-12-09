"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Telescope, LogOut } from "lucide-react";
import { useCurrentUser } from "@/components/user-context";
import type { Role } from "@/lib/mockdb";

function NavLink({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={[
        "rounded-xl px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-gray-900 text-white"
          : "text-gray-700 hover:bg-gray-200/70",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();

  const roleLabels: Record<Role, string> = {
    STUDENT: "Студент",
    TEACHER: "Преподаватель",
    ADMIN: "Админ",
  };

  const isCatalog = pathname.startsWith("/catalog");
  const isMy =
    pathname.startsWith("/my") ||
    pathname.startsWith("/catalog?mine") ||
    pathname.startsWith("/teacher/courses");
  const isAuthPage = pathname.startsWith("/login");
  const isStudentTests = pathname.startsWith("/student/tests");
  const isAdminUsers = pathname.startsWith("/admin/users");
  const isAdminInvites = pathname.startsWith("/admin/invites");

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Telescope className="h-8 w-8 text-gray-900" aria-hidden="true" />
          <Link href="/catalog" className="font-semibold tracking-tight">
            papaLMS
          </Link>
        </div>

        {/* Links */}
        <nav className="flex items-center gap-2">
          <NavLink href="/catalog" label="Каталог" isActive={isCatalog} />
          {/* «Мои курсы»: студенты — свои записи, преподаватели — свои курсы */}
          <NavLink
            href={user?.role === "TEACHER" ? "/teacher/courses" : "/catalog?mine=1"}
            label="Мои курсы"
            isActive={isMy}
          />
          {user?.role === "STUDENT" && (
            <NavLink href="/student/tests" label="Тестирование" isActive={isStudentTests} />
          )}
          {user?.role === "TEACHER" && (
            <NavLink href="/teacher/tools" label="Инструменты" isActive={pathname.startsWith("/teacher/tools")} />
          )}
          {user?.role === "ADMIN" && (
            <>
              <NavLink href="/admin/users" label="Пользователи" isActive={isAdminUsers} />
              <NavLink href="/admin/invites" label="Коды преподавателей" isActive={isAdminInvites} />
            </>
          )}
        </nav>

        {!isAuthPage && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 md:inline">
              {user?.name ?? "Гость"} · {user ? roleLabels[user.role] ?? user.role : "—"}
            </span>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {user ? "Выйти" : "Войти"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
