// src/lib/getCurrentUser.ts
import { prisma } from "./prisma";

// Если у проекта уже есть ready-made helper - импортируйте его вместо этого файла.
// Этот helper пробует NextAuth (если используется). Иначе - ожидает, что
// вы замените логику получения userId на вашу.
export async function getCurrentUserOrThrow() {
  // 1) Попробуем NextAuth (common case)
  try {
    // dynamic import to avoid hard dependency if next-auth not used
    const { getServerSession } = await import("next-auth/next");
    const authOptionsModule = await import("@/lib/nextAuthOptions").catch(() => null);
    if (getServerSession && authOptionsModule) {
      const session = await getServerSession(authOptionsModule.authOptions);
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (user) return user;
      }
    }
  } catch (e) {
    // игнорируем — может быть не установлен next-auth
  }

  // 2) Если у вас есть своя server helper - используйте его. (пример: src/lib/auth.ts)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const auth = require("@/lib/auth");
    // support multiple possible helper names (projects vary)
    const getter = auth?.getCurrentUser ?? auth?.currentUser ?? auth?.getCurrentUserOrThrow ?? auth?.default;
    if (getter) {
      const u = await getter();
      if (u?.id) return u;
    }
  } catch (e) {
    // ignore
  }

  // 3) Если ничего не подошло — бросаем понятную ошибку:
  throw new Error("Unauthenticated: please wire getCurrentUserOrThrow() to your auth system");
}
