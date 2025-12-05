// Client so we can choose the correct target for "Мои курсы" based on role
"use client";

import ProfileModule from "@/components/ProfileModule";
import Link from "next/link";
import { useCurrentUser } from "@/components/user-context";

export default function ProfilePage() {
  const { user } = useCurrentUser();
  const myCoursesHref = user?.role === "TEACHER" ? "/teacher/courses" : "/student/courses";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <Link href="/" className="hover:underline text-gray-600">Главная</Link>
                </li>
                <li className="text-gray-400">/</li>
                <li className="text-gray-800 font-semibold">Профиль</li>
              </ol>
            </nav>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">Профиль</h1>
            <p className="mt-1 text-sm text-gray-600">Управляйте своей информацией и фотографией профиля.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={myCoursesHref} className="inline-flex items-center px-4 py-2 bg-white border rounded-md text-sm text-gray-700 hover:bg-gray-50">
              Мои курсы
            </Link>
            <Link href="/" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
              На сайт
            </Link>
          </div>
        </div>

        <main>
          <div className="bg-transparent">
            <ProfileModule />
          </div>
        </main>
      </div>
    </div>
  );
}
