import { authenticationService } from "@/services/auth/index";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  username: z.string(),
  displayName: z.string(),
  email: z.string(),
  password: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    await authenticationService.initiateSignUp(body);
    return NextResponse.json(
      { message: "Verification code sent to email." },
      { status: 200 }
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
    if (message.includes("username")) {
      return NextResponse.json(
        {
          message:
            "This username is already taken. Please choose a different one.",
        },
        { status: 409 }
      );
    }

    if (message.includes("email")) {
      return NextResponse.json(
        {
          message:
            "This email is already registered. Please use a different email.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ message }, { status: 500 });
  }
}
