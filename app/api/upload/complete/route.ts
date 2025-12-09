import { NextRequest, NextResponse } from "next/server";
import { r2Client, R2_BUCKET_NAME, sanitizeFileName } from "@/lib/r2-client";
import { prisma } from "@/lib/prisma";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";

export async function POST(req: NextRequest) {
  try {
    const { uploadId, key, parts, fileName, fileSize, mimeType } =
      await req.json();

    if (!uploadId || !key || !parts?.length) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    const sortedParts = parts.sort((a, b) => a.partNumber - b.partNumber);

    const command = new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts.map((p) => ({
          PartNumber: p.partNumber,
          ETag: p.etag,
        })),
      },
    });

    await r2Client.send(command);

    const userId = req.headers.get("x-user-id") ?? null;

    const file = await prisma.file.create({
      data: {
        key,
        fileName: sanitizeFileName(fileName),
        fileSize,
        mimeType,
        bucket: R2_BUCKET_NAME,
        userId,
        uploadedAt: new Date(),
      },
    });

    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : `https://${R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`;

    return NextResponse.json({
      url: publicUrl,
      key,
      fileId: file.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
