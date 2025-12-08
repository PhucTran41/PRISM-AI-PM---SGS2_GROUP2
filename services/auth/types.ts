// services/auth/types.ts
export interface CheckUsernameAvailability {
  username: string;
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  email: string;
  password: string;
}

export interface CreateUserInputWithCode extends CreateUserInput {
  code: string;
}

export interface FinalizeSignUpInput {
  email: string;
  displayName: string;
  username: string;
  password: string;
  code?: string
}

export interface UserLoginInput {
  identifier: string;
  password: string;
}

export interface CreateUserResponse {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  googleAuth: boolean;
  githubAuth: boolean;
}

export interface UserProfileResponse {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  googleAuth: boolean;
  githubAuth: boolean;
}

export interface UserTokenPayload {
  id: string;
  username: string;
  googleAuth?: boolean;
  githubAuth?: boolean;
}

export type LoginUserTokenPayload = UserTokenPayload;

export interface TempTokenPayload {
  email: string;
}

export type VerificationType = "verifyEmail" | "passwordReset" | "changeEmail";

export type JWTPayload = UserTokenPayload | TempTokenPayload;
