// Client so we can choose the correct target for "Мои курсы" based on role
"use client";

import ProfileModule from "@/components/ProfileModule";
import Link from "next/link";
import { useCurrentUser } from "@/components/user-context";
import { useLanguage } from "@/components/language-context";

export default function ProfilePage() {
  const { user } = useCurrentUser();
  const { language } = useLanguage();
  const myCoursesHref = user?.role === "TEACHER" ? "/teacher/courses" : "/student/courses";
  const t = {
    breadcrumbHome: language === "ru" ? "Главная" : "Home",
    breadcrumbProfile: language === "ru" ? "Профиль" : "Profile",
    title: language === "ru" ? "Профиль" : "Profile",
    description: language === "ru" ? "Управляйте своей информацией и фотографией профиля." : "Manage your info and profile photo.",
    myCourses: language === "ru" ? "Мои курсы" : "My courses",
    toSite: language === "ru" ? "На сайт" : "Go to site",
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-blue-600 bg-white p-6">
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
              <Link href={myCoursesHref} className="inline-flex items-center px-4 py-2 bg-white border border-blue-600 rounded-md text-sm text-blue-600 hover:bg-blue-50">
                {t.myCourses}
              </Link>
              <Link href="/" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                {t.toSite}
              </Link>
            </div>
          </div>
        </div>

        <main>
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
            <ProfileModule />
          </div>
        </main>
      </div>
    </div>
  );
}
