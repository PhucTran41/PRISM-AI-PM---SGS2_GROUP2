import { authenticationService } from "@/services/auth/index";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string(),
  username: z.string(),
  displayName: z.string(),
  password: z.string(),
  code: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await authenticationService.finalizeSignUp({
      ...body,
      code: body.code ?? "",
    });

    return NextResponse.json(
      {
        message: "Successfully created account.",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Internal server error";

    if (message.includes("Verification failed")) {
      return NextResponse.json(
        { message: "Invalid or expired verification code." },
        { status: 401 }
      );
    }
    if (message.includes("username")) {
      return NextResponse.json(
        { message: "This username is already taken." },
        { status: 409 }
      );
    }
    if (message.includes("email")) {
      return NextResponse.json(
        { message: "This email is already registered." },
        { status: 409 }
      );
    }

    return NextResponse.json({ message }, { status: 500 });
  }
}
