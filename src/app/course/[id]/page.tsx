import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import {
  courses,
  getAnnouncementsForCourse,
  getAssignmentsForCourse,
  getCourseById,
  getMaterialsForCourse,
  getSessionsForCourse,
} from "@/lib/data";

type PageParams = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  return courses.map((course) => ({ id: course.id }));
}

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return (async () => {
    const { id } = await params;
    const course = getCourseById(id);
    return {
      title: course ? `${course.title} | Atlas LMS` : "Course | Atlas LMS",
    };
  })();
}

export default async function CourseDetailPage({ params }: PageParams) {
  const { id } = await params;
  const course = getCourseById(id);

  if (!course) {
    notFound();
  }

  const courseAssignments = getAssignmentsForCourse(course.id);
  const courseSessions = getSessionsForCourse(course.id);
  const courseMaterials = getMaterialsForCourse(course.id);
  const courseAnnouncements = getAnnouncementsForCourse(course.id);

  const upcomingSession = courseSessions[0];

  return (
    <div className="min-h-screen bg-white">
      <NavBar title="Atlas LMS" links={[{ href: "/catalog", label: "Catalog" }]} />
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        <section className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            {course.category}
          </p>
          <h1 className="text-4xl font-semibold text-zinc-900">{course.title}</h1>
          <p className="text-lg text-zinc-600">{course.summary}</p>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
            <span>Instructor: {course.instructor}</span>
            <span>Students enrolled: {course.students}</span>
            <span>{course.sessions} total sessions</span>
          </div>
        </section>

        {upcomingSession && (
          <section className="rounded-2xl border border-zinc-100 bg-emerald-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Next live session
            </p>
            <div className="mt-2 flex flex-col gap-2 text-zinc-700 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  {upcomingSession.topic}
                </h2>
                <p>
                  {new Date(upcomingSession.startsAt).toLocaleString()} · {upcomingSession.durationMinutes} minutes · {upcomingSession.modality}
                </p>
              </div>
              <Link
                href={`/course/${course.id}/session/${upcomingSession.id}`}
                className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
              >
                View session details
              </Link>
            </div>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">Assignments</h2>
              <Link href="/api/assignments" className="text-sm font-medium text-emerald-600">
                Export
              </Link>
            </div>
            <div className="space-y-3">
              {courseAssignments.map((assignment) => (
                <article
                  key={assignment.id}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{assignment.status === "open" ? "Open" : "Closed"}</span>
                    <time>Due {new Date(assignment.dueDate).toLocaleDateString()}</time>
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900">
                    {assignment.title}
                  </h3>
                  <p className="text-sm text-zinc-600">{assignment.points} pts</p>
                </article>
              ))}
              {!courseAssignments.length && (
                <p className="rounded-2xl border border-dashed border-zinc-200 px-5 py-10 text-center text-sm text-zinc-500">
                  No assignments have been published for this cohort yet.
                </p>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">Materials</h2>
              <Link href="/api/materials" className="text-sm font-medium text-emerald-600">
                Download all
              </Link>
            </div>
            <div className="space-y-3">
              {courseMaterials.map((material) => (
                <article
                  key={material.id}
                  className="rounded-2xl border border-zinc-100 bg-white px-5 py-4 shadow-sm"
                >
                  <div className="text-xs uppercase tracking-wide text-zinc-500">
                    {material.type}
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900">
                    {material.title}
                  </h3>
                  <a
                    href={material.url}
                    className="text-sm font-medium text-emerald-600"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open resource
                  </a>
                </article>
              ))}
              {!courseMaterials.length && (
                <p className="rounded-2xl border border-dashed border-zinc-200 px-5 py-10 text-center text-sm text-zinc-500">
                  Resources will appear here once the instructor uploads them.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6">
          <h2 className="text-xl font-semibold text-zinc-900">Announcements</h2>
          <div className="mt-4 space-y-3">
            {courseAnnouncements.map((announcement) => (
              <article key={announcement.id} className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <div className="text-xs text-zinc-500">
                  {new Date(announcement.date).toLocaleDateString()}
                </div>
                <h3 className="text-base font-semibold text-zinc-900">
                  {announcement.title}
                </h3>
                <p className="text-sm text-zinc-600">{announcement.body}</p>
              </article>
            ))}
            {!courseAnnouncements.length && (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                No announcements yet.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
