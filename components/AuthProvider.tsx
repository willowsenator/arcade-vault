"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

export type User = { name: string };
type AuthContextValue = {
  user: User | null;
  login: (user: User | null) => void;
  signOut: () => void;
};

const USER_KEY = "av_user";
const AuthContext = createContext<AuthContextValue | null>(null);
const listeners = new Set<() => void>();
let userOverride: User | null | undefined;
let cachedStoredValue: string | null | undefined;
let cachedStoredUser: User | null = null;

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const storedValue = localStorage.getItem(USER_KEY);
    if (storedValue === cachedStoredValue) return cachedStoredUser;
    const parsedUser = JSON.parse(storedValue || "null") as User | null;
    cachedStoredValue = storedValue;
    cachedStoredUser = parsedUser;
    return cachedStoredUser;
  } catch {
    cachedStoredValue = null;
    cachedStoredUser = null;
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): User | null {
  return userOverride === undefined ? readStoredUser() : userOverride;
}

function getServerSnapshot(): User | null {
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const login = useCallback((nextUser: User | null) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      cachedStoredValue = JSON.stringify(nextUser);
      cachedStoredUser = nextUser;
      userOverride = undefined;
    } catch {
      // localStorage unavailable or full — keep the in-memory session
      userOverride = nextUser;
    }
    notifyListeners();
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(USER_KEY);
      cachedStoredValue = null;
      cachedStoredUser = null;
      userOverride = undefined;
    } catch {
      // localStorage unavailable — keep the in-memory sign-out
      userOverride = null;
    }
    notifyListeners();
  }, []);

  const value = useMemo(
    () => ({ user, login, signOut }),
    [user, login, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
