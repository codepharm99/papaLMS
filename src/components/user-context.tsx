"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Role } from "@/lib/mockdb";

type User = { id: string; name: string; role: Role } | null;

type UserContextValue = {
  user: User;
  setUser: Dispatch<SetStateAction<User>>;
  refresh: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

type UserProviderProps = {
  initialUser: User;
  children: ReactNode;
};

export function UserProvider({ initialUser, children }: UserProviderProps) {
  const [user, setUser] = useState<User>(initialUser ?? null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(initialUser ?? null);
  }, [initialUser]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data: { user: User } = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      refresh,
    }),
    [user, refresh]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within UserProvider");
  }
  return ctx;
}
