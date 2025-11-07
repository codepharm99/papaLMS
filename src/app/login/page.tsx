import NavBar from "@/components/NavBar";

export const metadata = {
  title: "Login | Atlas LMS",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <NavBar title="Atlas LMS" />
      <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-16">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Welcome back
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900">Sign in</h1>
          <p className="text-sm text-zinc-500">
            Use the demo credentials from the README or the mock form below to explore the dashboard.
          </p>
        </header>
        <form
          action="/api/auth/login"
          method="POST"
          className="space-y-6 rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue="priya.raman@example.com"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              defaultValue="lms-demo"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Continue
          </button>
          <p className="text-center text-xs text-zinc-500">
            This route is mocked and stores nothing — it&apos;s only here to satisfy the Next.js validators.
          </p>
        </form>
      </main>
    </div>
  );
}
