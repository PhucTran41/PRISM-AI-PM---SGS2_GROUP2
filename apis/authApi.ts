import {
  CreateUserInput,
  FinalizeSignUpInput,
  UserLoginInput,
} from "@/services/auth/types";
import { apiRequest } from "./api";

function internalRequest(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  return apiRequest(path, options, token, { internal: true });
}

export async function checkUsername(username: string) {
  return internalRequest("/api/auth/check-username", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export async function initiateSignup(data: CreateUserInput) {
  return internalRequest("/api/auth/initiate-signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function verifyEmailCode(
  email: string,
  code: string,
  type: string
) {
  return internalRequest("/api/auth/email-verify-verification", {
    method: "POST",
    body: JSON.stringify({ email, code, type }),
  });
}

export async function sendEmailVerificationCode(email: string) {
  return internalRequest("/api/auth/email-verification-code", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function finalizeSignup(data: FinalizeSignUpInput) {
  return internalRequest("/api/auth/finalize-signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(data: UserLoginInput) {
  return internalRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getUserProfile(token: string) {
  return internalRequest("/api/auth/profile", { method: "GET" }, token);
}
