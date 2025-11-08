import type { Metadata } from "next";
import "./globals.css";
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
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <UserProvider initialUser={initialUser}>
          <Nav />
          <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
