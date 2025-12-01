"use client";

import { verifyEmailCode } from "@/apis/authApi";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export const useVerifyEmailCode = () => {
  const [isCodeValid, setIsCodeValid] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");

  const mutation = useMutation({
    mutationFn: ({
      email,
      code,
      type,
    }: {
      email: string;
      code: string;
      type: string;
    }) => verifyEmailCode(email, code, type),
    onSuccess: (res) => {
      setIsCodeValid(true);
      setMessage(res.message);
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      setIsCodeValid(false);
      setMessage(msg);
    },
  });

  const handleVerifyEmailCode = async (
    email: string,
    code: string,
    type: string
  ) => {
    try {
      await mutation.mutateAsync({ email, code, type });
      return true;
    } catch {
      return false;
    }
  };

  return { handleVerifyEmailCode, isCodeValid, message };
};
