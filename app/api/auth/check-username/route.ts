import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticationService } from "@/services/auth/index";

const bodySchema = z.object({
  username: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const exists = await authenticationService.checkUsernameAvailability(body);

    if (exists) {
      return NextResponse.json(
        {
          available: false,
          message:
            "Username is unavailable. Try adding numbers, letters, underscores _ , or periods.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        available: true,
        message: "Username is available. Nice!",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          available: false,
          message: error.issues[0]?.message ?? "Invalid request body",
        },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        available: false,
        message,
      },
      { status: 500 }
    );
  }
}
