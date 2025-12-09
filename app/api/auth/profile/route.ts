import { NextRequest, NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/services/auth/auth";
import { userManagementService } from "@/services/auth";

export async function GET(request: NextRequest) {
  try {
    const { payload } = requireAuth(request);
    const user = await userManagementService.getUserById(payload.id);

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ message: message }, { status: 404 });
  }
}
