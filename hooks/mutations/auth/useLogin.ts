// hooks/mutations/auth/useLogin.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { useUser } from "@/context/userContext";
import Cookies from "js-cookie";
import { login } from "@/apis/authApi";
import { UserLoginInput } from "@/services/auth/types";

export const useLogin = () => {
  const { setUser } = useUser();

  const mutation = useMutation({
    mutationFn: (data: UserLoginInput) => login(data),
    onSuccess: (loginData) => {
      Cookies.set("auth-token", loginData.token, {
        expires: 10,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
      setUser(loginData.user);
    },
  });

  return {
    handleLogin: mutation.mutateAsync,
    loading: mutation.isPending,
    error: (mutation.error as Error | null)?.message ?? null,
  };
};
