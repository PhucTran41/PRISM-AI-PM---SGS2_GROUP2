"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { User } from "@/context/userContext";
import { getUserProfile } from "@/apis/authApi";

export function useUserProfileQuery() {
  const token = Cookies.get("auth-token");
  return useQuery({
    queryKey: ["user", "profile"],
    queryFn: async () => {
      if (!token) return null as unknown as { user: User };
      return getUserProfile(token);
    },
    enabled: !!token,
    staleTime: 1000 * 60,
  });
}

export function useSetUserInCache() {
  const qc = useQueryClient();
  return (user: User | null) => {
    qc.setQueryData(["user", "profile"], user ? { user } : undefined);
  };
}
