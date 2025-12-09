import { NextRequest, NextResponse } from "next/server";
import { r2MultipartCleanup } from "@/lib/r2-cleanup";

export async function POST(req: NextRequest) {
  try {
    const { key, uploadId } = await req.json();

    if (!key || !uploadId) {
      return NextResponse.json(
        {
          error: "Missing parameters",
          message: "key and uploadId are required",
        },
        { status: 400 }
      );
    }

    const success = await r2MultipartCleanup.abortUpload(key, uploadId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Aborted upload for ${key}`,
      });
    }

    return NextResponse.json(
      {
        error: "Abort failed",
        message: `Failed to abort upload for ${key}`,
      },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to abort upload",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
