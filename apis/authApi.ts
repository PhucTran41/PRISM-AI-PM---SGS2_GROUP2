import { apiRequest } from "./api";
import {
  CreateUserInput,
  FinalizeSignUpInput,
  UserLoginInput,
} from "@/services/auth/types";

export async function checkUsername(username: string) {
  return apiRequest("/api/users/check-username", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export async function initiateSignup(data: CreateUserInput) {
  return apiRequest("/api/users/initiate-signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function verifyEmailCode(
  email: string,
  code: string,
  type: string
) {
  return apiRequest("/api/users/email-verify-verification", {
    method: "POST",
    body: JSON.stringify({ email, code, type }),
  });
}

export async function sendEmailVerificationCode(email: string) {
  return apiRequest("/api/users/email-verification-code", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function finalizeSignup(data: FinalizeSignUpInput) {
  return apiRequest("/api/users/finalize-signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(data: UserLoginInput) {
  return apiRequest("/api/users/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getUserProfile(token: string) {
  return apiRequest("/api/users/profile", { method: "GET" }, token);
}
