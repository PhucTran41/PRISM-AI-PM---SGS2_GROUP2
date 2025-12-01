"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkUsername } from "@/apis/authApi";

const useDebouncedValue = (value: string, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
};

export const useCheckUsername = (username: string) => {
  const debouncedUsername = useDebouncedValue(username, 1500);

  const { data, refetch } = useQuery({
    queryKey: ["users", "check-username", debouncedUsername],
    queryFn: () => checkUsername(debouncedUsername),
    enabled: !!debouncedUsername && debouncedUsername.trim().length >= 3,
  });

  const available = data?.available ?? null;
  const message = data?.message ?? "";

  const handleBlur = () => {
    if (username && username.trim().length >= 3) {
      void refetch();
    }
  };

  return { available, message, handleBlur };
};
