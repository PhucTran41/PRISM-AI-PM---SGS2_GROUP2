"use client";

import { initiateSignup } from "@/apis/authApi";
import { CreateUserInput } from "@/services/auth/types";
import { useMutation } from "@tanstack/react-query";

export const useInitiateSignup = () => {
  const mutation = useMutation({
    mutationFn: (data: CreateUserInput) => initiateSignup(data),
  });

  return {
    handleInitiateSignup: mutation.mutate,
    loading: mutation.isPending,
    error: (mutation.error as Error | null)?.message ?? null,
    success: !!mutation.data,
  };
};
