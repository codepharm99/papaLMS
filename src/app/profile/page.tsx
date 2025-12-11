// Client so we can choose the correct target for "Мои курсы" based on role
"use client";

import type { CSSProperties } from "react";
import ProfileModule from "@/components/ProfileModule";
import Link from "next/link";
import { useCurrentUser } from "@/components/user-context";
import { useLanguage } from "@/components/language-context";

export default function ProfilePage() {
  const { user } = useCurrentUser();
  const { language } = useLanguage();
  const myCoursesHref = user?.role === "TEACHER" ? "/teacher/courses" : "/student/courses";
  const heroPaint: CSSProperties = {
    "--module-accent-1": "230 82% 72%",
    "--module-accent-2": "258 78% 70%",
    "--module-accent-3": "289 74% 68%",
  };
  const bodyPaint: CSSProperties = {
    "--module-accent-1": "206 82% 78%",
    "--module-accent-2": "183 76% 74%",
    "--module-accent-3": "162 72% 70%",
  };
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };
  const t = {
    breadcrumbHome: language === "ru" ? "Главная" : "Home",
    breadcrumbProfile: language === "ru" ? "Профиль" : "Profile",
    title: language === "ru" ? "Профиль" : "Profile",
    description: language === "ru" ? "Управляйте своей информацией и фотографией профиля." : "Manage your info and profile photo.",
    myCourses: language === "ru" ? "Мои курсы" : "My courses",
    toSite: language === "ru" ? "На сайт" : "Go to site",
  };

  return (
    <div className="page-aurora min-h-screen bg-gray-50" style={pagePaint}>
      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div
          className="module-illustration rounded-3xl border bg-white/95 p-6 shadow-sm"
          style={heroPaint}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li>
                    <Link href="/" className="hover:underline text-gray-600">{t.breadcrumbHome}</Link>
                  </li>
                  <li className="text-gray-400">/</li>
                  <li className="text-gray-800 font-semibold">{t.breadcrumbProfile}</li>
                </ol>
              </nav>
              <h1 className="mt-3 text-3xl font-bold text-gray-900">{t.title}</h1>
              <p className="mt-1 text-sm text-gray-600">{t.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={myCoursesHref} className="inline-flex items-center px-4 py-2 bg-white border rounded-md text-sm text-gray-700 hover:bg-gray-50">
                {t.myCourses}
              </Link>
              <Link href="/" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
                {t.toSite}
              </Link>
            </div>
          </div>
        </div>

        <main>
          <div
            className="module-illustration light mt-6 rounded-3xl border bg-white/95 p-4 shadow-sm sm:p-6"
            style={bodyPaint}
          >
            <ProfileModule />
          </div>
        </main>
      </div>
    </div>
  );
}
