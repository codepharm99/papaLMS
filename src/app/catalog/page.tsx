import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import NavBar from "@/components/NavBar";
import SearchBar from "@/components/SearchBar";
import Tabs from "@/components/Tabs";
import { announcements, courses } from "@/lib/data";

export const metadata = {
  title: "Catalog | Atlas LMS",
  description: "Browse active courses, see instructors, and catch up on the latest announcements.",
};

const categoryTabs = [
  { id: "all", label: "All tracks" },
  ...Array.from(new Set(courses.map((course) => course.category))).map(
    (category) => ({ id: category.toLowerCase(), label: category })
  ),
];

export default function CatalogPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <NavBar title="Atlas LMS" />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
        <section className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                Course catalog
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-zinc-900">
                Continue building your learning roadmap
              </h1>
              <p className="mt-2 max-w-2xl text-base text-zinc-600">
                Filter by discipline, skim instructor bios, and jump directly into each live cohort or asynchronous module.
              </p>
            </div>
            <SearchBar placeholder="Search by title, tag, or instructor" />
          </div>
          <Tabs tabs={categoryTabs} activeId="all" />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                Latest announcements
              </p>
              <h2 className="text-2xl font-semibold text-zinc-900">
                Stay aligned with faculty updates
              </h2>
            </div>
            <Link href="/login" className="text-sm font-medium text-emerald-600">
              Manage notifications
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {announcements.map((announcement) => (
              <article
                key={announcement.id}
                className="rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500">
                  <span>{announcement.courseId}</span>
                  <time>{new Date(announcement.date).toLocaleDateString()}</time>
                </div>
                <h3 className="mt-1 text-base font-semibold text-zinc-900">
                  {announcement.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-600">{announcement.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
