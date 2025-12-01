"use client";

import { finalizeSignup } from "@/apis/authApi";
import { FinalizeSignUpInput } from "@/services/auth/types";
import { useMutation } from "@tanstack/react-query";

export const useFinalizeSignup = () => {
  const mutation = useMutation({
    mutationFn: (data: FinalizeSignUpInput) => finalizeSignup(data),
  });

  return {
    handleFinalizeSignup: mutation.mutateAsync,
    loading: mutation.isPending,
    error: (mutation.error as Error | null)?.message ?? null,
  };
};
