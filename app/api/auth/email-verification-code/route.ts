import { verificationService } from "@/services/auth/index";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { email } = bodySchema.parse(await request.json());
    await verificationService.sendEmailVerificationCode(email);

    return NextResponse.json(
      {
        message: `Email verification code sent to your email ${email}. Please check your inbox.`,
        success: true,
        data: {
          email,
          codeSent: true,
          expiresIn: "15 minutes",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid request body",
          error: "INVALID_REQUEST",
        },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to send verification code";

    return NextResponse.json(
      {
        message: message,
        error: "FAILED_TO_SEND_VERIFICATION_CODE",
      },
      { status: 400 }
    );
  }
}
