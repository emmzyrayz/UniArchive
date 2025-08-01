import { NextRequest, NextResponse } from "next/server";
import { createB2Client } from "@/lib/backblaze.b2";

export async function GET(
  request: NextRequest,
  { params }: { params: { fileName: string } }
) {
  try {
    const fileName = params.fileName;
    if (!fileName) {
      return NextResponse.json(
        { success: false, message: "File name is required" },
        { status: 400 }
      );
    }

    const b2Client = createB2Client();
    const result = await b2Client.fileExists(fileName);

    return NextResponse.json({
      success: true,
      exists: result.exists,
      fileInfo: result.fileInfo,
    });
  } catch (error) {
    console.error("File existence check error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check file existence",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
