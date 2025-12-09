import { NextRequest, NextResponse } from "next/server";
import { UPLOAD_VALIDATION } from "@/lib/r2-client";

export async function POST(req: NextRequest) {
  const { fileName, fileSize, mimeType } = await req.json();
  const errors: Array<{ field: string; message: string }> = [];

  if (!UPLOAD_VALIDATION.allowedMimeTypes.includes(mimeType)) {
    errors.push({
      field: "mimeType",
      message: `File type ${mimeType} is not allowed. Allowed types: ${UPLOAD_VALIDATION.allowedMimeTypes.join(
        ", "
      )}`,
    });
  }

  if (fileSize > UPLOAD_VALIDATION.maxFileSize) {
    errors.push({
      field: "fileSize",
      message: `File size ${fileSize} bytes exceeds maximum ${UPLOAD_VALIDATION.maxFileSize} bytes`,
    });
  }

  if (fileSize === 0) {
    errors.push({ field: "fileSize", message: "File cannot be empty" });
  }

  if (!fileName) {
    errors.push({ field: "fileName", message: "File name is required" });
  }

  if (fileName?.length > 255) {
    errors.push({ field: "fileName", message: "File name is too long" });
  }

  if (errors.length > 0)
    return NextResponse.json({ valid: false, errors }, { status: 400 });

  return NextResponse.json({ valid: true });
}
