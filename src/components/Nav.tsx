"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Telescope } from "lucide-react";
import { useCurrentUser } from "@/components/user-context";
import AccountMenu from "@/components/AccountMenu";
import { useLanguage } from "@/components/language-context";
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
  const { user } = useCurrentUser();
  const { language } = useLanguage();

  const roleLabels: Record<Role, { ru: string; en: string }> = {
    STUDENT: { ru: "Студент", en: "Student" },
    TEACHER: { ru: "Преподаватель", en: "Teacher" },
    ADMIN: { ru: "Админ", en: "Admin" },
  };
  const t = {
    catalog: language === "ru" ? "Каталог" : "Catalog",
    myCourses: language === "ru" ? "Мои курсы" : "My courses",
    testing: language === "ru" ? "Тестирование" : "Testing",
    profile: language === "ru" ? "Профиль" : "Profile",
    tools: language === "ru" ? "Инструменты" : "Tools",
    invites: language === "ru" ? "Коды преподавателей" : "Teacher invites",
    guest: language === "ru" ? "Гость" : "Guest",
  };

  const isCatalog = pathname.startsWith("/catalog");
  const isMy =
    pathname.startsWith("/student/courses") ||
    pathname.startsWith("/teacher/courses");
  const isAuthPage = pathname.startsWith("/login");
  const isStudentTests = pathname.startsWith("/student/tests");

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
          <NavLink href="/catalog" label={t.catalog} isActive={isCatalog} />
          {/* «Мои курсы»: студенты — свои записи, преподаватели — свои курсы */}
          <NavLink
            href={user?.role === "TEACHER" ? "/teacher/courses" : "/student/courses"}
            label={t.myCourses}
            isActive={isMy}
          />
          {user?.role === "STUDENT" && (
            <NavLink href="/student/tests" label={t.testing} isActive={isStudentTests} />
          )}
          {user && <NavLink href="/profile" label={t.profile} isActive={pathname.startsWith("/profile")} />}
          {user?.role === "TEACHER" && (
            <NavLink href="/teacher/tools" label={t.tools} isActive={pathname.startsWith("/teacher/tools")} />
          )}
          {user?.role === "ADMIN" && (
            <NavLink href="/admin/invites" label={t.invites} isActive={pathname.startsWith("/admin/invites")} />
          )}
        </nav>

        {!isAuthPage && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 md:inline">
              {user?.name ?? t.guest} · {user ? roleLabels[user.role]?.[language] ?? user.role : "—"}
            </span>
            <AccountMenu user={user ?? null} />
          </div>
        )}
      </div>
    </header>
  );
}
