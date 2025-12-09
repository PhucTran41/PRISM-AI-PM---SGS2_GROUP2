import { NextRequest, NextResponse } from "next/server";
import { R2_BUCKET_NAME, UPLOAD_VALIDATION, r2Client } from "@/lib/r2-client";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(req: NextRequest) {
  try {
    const { uploadId, key, partNumber } = await req.json();

    if (!uploadId || !key || !partNumber) {
      return NextResponse.json(
        {
          error: "Missing parameters",
          message: "uploadId, key, partNumber required",
        },
        { status: 400 }
      );
    }

    if (partNumber < 1 || partNumber > 10000) {
      return NextResponse.json(
        {
          error: "Invalid part number",
        },
        { status: 400 }
      );
    }

    const command = new UploadPartCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const url = await getSignedUrl(r2Client, command, {
      expiresIn: UPLOAD_VALIDATION.presignedUrlExpiry,
    });

    return NextResponse.json({ url, partNumber });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
