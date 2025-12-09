import { NextRequest, NextResponse } from "next/server";
import { r2MultipartCleanup } from "@/lib/r2-cleanup";

export async function POST(req: NextRequest) {
  try {
    const { prefix, olderThanHours, confirm } = await req.json();

    if (!confirm) {
      return NextResponse.json(
        {
          error: "Confirmation required",
          message: "Set confirm: true to proceed with cleanup",
        },
        { status: 400 }
      );
    }

    const result = await r2MultipartCleanup.abortAllUploads(
      prefix || undefined,
      olderThanHours
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Cleanup failed",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
