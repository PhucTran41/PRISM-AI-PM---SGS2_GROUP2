import { verificationService } from "@/services/auth/index";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string(),
  code: z.string(),
  type: z.literal("verifyEmail"),
});

export async function POST(request: NextRequest) {
  try {
    const { email, code, type } = bodySchema.parse(await request.json());
    await verificationService.verifyVerificationCode(code, type, email);

    return NextResponse.json(
      { message: "Email verified successfully" },
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

    if (message.includes("Invalid verification type")) {
      return NextResponse.json(
        {
          message: "Invalid verification type provided.",
          error: "INVALID_VERIFICATION_TYPE",
        },
        { status: 400 }
      );
    }
    if (message.includes("No verification code found")) {
      return NextResponse.json(
        {
          message,
          error: "VERIFICATION_CODE_NOT_FOUND",
        },
        { status: 404 }
      );
    }
    if (message.includes("expired")) {
      return NextResponse.json(
        {
          message,
          error: "VERIFICATION_CODE_EXPIRED",
        },
        { status: 410 }
      );
    }
    if (message.includes("incorrect")) {
      return NextResponse.json(
        {
          message,
          error: "INCORRECT_VERIFICATION_CODE",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ message }, { status: 500 });
  }
}
