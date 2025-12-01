import { authenticationService } from "@/services/auth/index";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  identifier: z.string(),
  password: z.string().optional(),
  token: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const { token, data } = await authenticationService.login(
      body.identifier,
      body.password,
      body.token
    );

    return NextResponse.json({ token, user: data }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Invalid credentials";

    return NextResponse.json({ message: message }, { status: 401 });
  }
}
