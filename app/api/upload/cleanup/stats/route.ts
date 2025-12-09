import { NextRequest, NextResponse } from "next/server";
import { r2MultipartCleanup } from "@/lib/r2-cleanup";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get("prefix") || undefined;

    const stats = await r2MultipartCleanup.getUploadStats(prefix);
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to get stats",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
