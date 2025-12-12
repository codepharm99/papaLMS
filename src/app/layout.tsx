import type { Metadata } from "next";
import "./globals.css";
import AuroraBackground from "@/components/AuroraBackground";
import Nav from "@/components/Nav";
import { UserProvider } from "@/components/user-context";
import { currentUser } from "@/lib/auth";
import { LanguageProvider } from "@/components/language-context";

export const metadata: Metadata = {
  title: "papaLMS",
  description: "LMS на Next.js",
};

const THEME_KEY = "lms-theme";
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_KEY}') || 'auto';
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var applied = stored === 'auto' ? system : stored;
    if (applied === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    // ignore
  }
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await currentUser();
  const initialUser = me ? { id: me.id, name: me.name, role: me.role } : null;

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen relative bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <AuroraBackground />
        <LanguageProvider>
          <UserProvider initialUser={initialUser}>
            <div className="relative z-10 flex min-h-screen flex-col">
              <Nav />
              <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
            </div>
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
