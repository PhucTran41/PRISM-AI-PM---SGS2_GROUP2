import { NextRequest, NextResponse } from "next/server";
import {
  r2Client,
  R2_BUCKET_NAME,
  UPLOAD_VALIDATION,
  generateFileKey,
  sanitizeFileName,
} from "@/lib/r2-client";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileSize, mimeType } = await req.json();

    if (!UPLOAD_VALIDATION.allowedMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        {
          error: "Invalid file type",
          message: `File type ${mimeType} is not allowed`,
        },
        { status: 400 }
      );
    }

    if (fileSize > UPLOAD_VALIDATION.maxFileSize) {
      return NextResponse.json(
        {
          error: "File too large",
          message: `File exceeds limit`,
        },
        { status: 400 }
      );
    }

    // example userId extraction
    const userId = req.headers.get("x-user-id") ?? undefined;

    const key = generateFileKey(fileName, userId);

    const command = new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
      Metadata: {
        originalName: sanitizeFileName(fileName),
        uploadedBy: userId || "anonymous",
      },
    });

    const res = await r2Client.send(command);

    if (!res.UploadId)
      return NextResponse.json(
        { error: "Upload creation failed" },
        { status: 500 }
      );

    return NextResponse.json({ uploadId: res.UploadId, key });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
