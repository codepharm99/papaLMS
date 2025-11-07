import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "LMS Demo",
  description: "Минимальная LMS-демо на Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Nav user={{ name: "Гость", role: "STUDENT" }} />
        <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
      </body>
    </html>
  );
}