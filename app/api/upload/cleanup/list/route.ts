import { NextRequest, NextResponse } from "next/server";
import { r2MultipartCleanup } from "@/lib/r2-cleanup";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get("prefix") || undefined;
    const maxResultsRaw = searchParams.get("maxResults");
    const maxResults = maxResultsRaw ? parseInt(maxResultsRaw, 10) : undefined;

    const uploads = await r2MultipartCleanup.listIncompleteUploads(
      prefix,
      maxResults
    );

    return NextResponse.json({
      uploads,
      count: uploads.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to list uploads",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
