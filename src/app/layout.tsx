import type { Metadata } from "next";
import "./globals.css";
import AuroraBackground from "@/components/AuroraBackground";
import Nav from "@/components/Nav";
import { UserProvider } from "@/components/user-context";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "papaLMS",
  description: "LMS на Next.js",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await currentUser();
  const initialUser = me ? { id: me.id, name: me.name, role: me.role } : null;

  return (
    <html lang="ru">
      <body className="min-h-screen relative bg-gradient-to-b from-[#020617] via-[#090b26] to-[#1c0a37]">
        <AuroraBackground />
        <UserProvider initialUser={initialUser}>
          <div className="relative z-10 flex min-h-screen flex-col">
            <Nav />
            <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
