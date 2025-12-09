import { NextRequest, NextResponse } from "next/server";
import { ListPartsCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2-client";

export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;
    const uploadId = params.get("uploadId");
    const key = params.get("key");

    if (!uploadId || !key) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    const res = await r2Client.send(
      new ListPartsCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
      })
    );

    const parts =
      res.Parts?.map((p) => ({
        partNumber: p.PartNumber!,
        etag: p.ETag!.replace(/"/g, ""),
      })) ?? [];

    return NextResponse.json({ parts });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
