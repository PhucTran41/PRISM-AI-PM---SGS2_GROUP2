import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { LoginUserTokenPayload } from "./types";

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export const extractBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
};

export const verifyAuthToken = (
  token: string
): LoginUserTokenPayload & { exp?: number; iat?: number } => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  try {
    return jwt.verify(token, jwtSecret) as LoginUserTokenPayload & {
      exp?: number;
      iat?: number;
    };
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
};

export const requireAuth = (request: NextRequest) => {
  const token = extractBearerToken(request);
  if (!token) {
    throw new UnauthorizedError();
  }
  const payload = verifyAuthToken(token);
  return { token, payload };
};
