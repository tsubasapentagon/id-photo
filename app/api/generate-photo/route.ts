import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, bgColor } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が設定されていません" },
        { status: 500 }
      );
    }

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: "画像データがありません" },
        { status: 400 }
      );
    }

    const selectedBgColor = bgColor || "白";

    const prompt = `
新卒就活生向けの証明写真として自然に整えてください。
本人の顔立ちは変えず、別人にしないでください。
背景色は「${selectedBgColor}」にしてください。
清潔感のある明るい印象にしてください。
可能であれば黒または紺のスーツ風に整えてください。
縦長の3:4比率にしてください。
肌の加工は一切しないでください。
履歴書やESで使える自然な雰囲気にしてください。
`;

    const generateOne = async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((part) => part.inlineData?.data);

      if (!imagePart?.inlineData?.data) {
        throw new Error("画像生成に失敗しました");
      }

      return {
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || "image/png",
      };
    };

    const results = await Promise.all([generateOne(), generateOne()]);

    return NextResponse.json({
      images: results,
    });
  } catch (error) {
    console.error("Gemini error:", error);

    return NextResponse.json(
      { error: "Gemini APIでエラーが発生しました" },
      { status: 500 }
    );
  }
}
