import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

interface JWT_PAYLOAD {
  id: string;
  username: string;
  googleAuth?: boolean;
  githubAuth?: boolean;
}

// Change this to match how you sign/encrypt your token
const JWT_SECRET = process.env.JWT_SECRET!;

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("auth-token")?.value;

  let userId: string | null = null;

  if (token) {
    try {
      // If your auth-token is a JWT (recommended)
      const payload = jwt.verify(token, JWT_SECRET) as JWT_PAYLOAD;

      // You can check the payload for specific fields. In your case, you want the 'id' field.
      userId =
        (payload.id as string) ??
        // Log the entire payload for debugging purposes (optional)
        console.log("JWT Payload:", payload);

      // Optionally, you can verify the presence of other fields (e.g., 'email', 'role', etc.)
      // const userEmail = payload.email as string;
      // const userRole = payload.role as string;
    } catch (err) {
      // Invalid or expired token → treat as unauthenticated
      console.warn("Invalid auth-token", err);
    }
  }

  // Clone the request headers and inject userId
  const requestHeaders = new Headers(req.headers);
  if (userId) {
    requestHeaders.set("x-user-id", userId);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}

export const config = {
  matcher: [
    "/api/upload/:path*", // your upload routes
  ],
};
