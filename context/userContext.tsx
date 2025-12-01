// context/userContext.tsx
"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import Cookies from "js-cookie";
import {
  useSetUserInCache,
  useUserProfileQuery,
} from "@/hooks/queries/user/useUser";

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  googleAuth: boolean;
  githubAuth: boolean;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { data, isLoading } = useUserProfileQuery();
  const setUserInCache = useSetUserInCache();

  const value = useMemo<UserContextType>(() => {
    const user = data?.user ?? null;

    const setUser = (next: User | null) => {
      if (!next) Cookies.remove("auth-token");
      setUserInCache(next);
    };

    return { user, loading: isLoading, setUser };
  }, [data, isLoading, setUserInCache]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};
