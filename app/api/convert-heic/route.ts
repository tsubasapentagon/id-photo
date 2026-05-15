import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const convert = require("heic-convert");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "ファイルがありません" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.95,
    });

    const base64 = Buffer.from(outputBuffer).toString("base64");

    return NextResponse.json({
      imageBase64: base64,
      mimeType: "image/jpeg",
    });
  } catch (error) {
    console.error("HEIC convert error:", error);

    return NextResponse.json(
      {
        error:
          "HEIC画像の変換に失敗しました。JPEG/PNG画像でお試しください。",
      },
      { status: 500 }
    );
  }
}