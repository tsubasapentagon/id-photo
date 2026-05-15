import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const {
      imageBase64,
      mimeType,
      bgColor,
      gender,
    } = await req.json();

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
    const selectedGender = gender || "男性";

    const prompt = `
新卒就活生向けの証明写真として自然に整えてください。

【絶対条件】
- 本人の顔立ちは一切変更しない
- 別人にしない
- 顔の輪郭を変更しない
- 目、鼻、口を変更しない
- 髪型を変更しない
- 肌加工は禁止
- 美肌加工は禁止
- AIっぽい顔にしない
- 自然な写真館クオリティ

【証明写真条件】
- 背景色は「${selectedBgColor}」
- 性別は「${selectedGender}」
- ${selectedGender}用の就活スーツを着用
- 清潔感のある雰囲気
- 履歴書やESで使用できる自然な証明写真
- 3:4の縦長比率
- 胸から上が映る構図
- 正面を向く
- 明るすぎない自然なライティング

【重要】
顔を変えず、写真を証明写真風に整えるイメージ。
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

      const parts =
        response.candidates?.[0]?.content?.parts || [];

      const imagePart = parts.find(
        (part) => part.inlineData?.data
      );

      if (!imagePart?.inlineData?.data) {
        throw new Error("画像生成に失敗しました");
      }

      return {
        imageBase64: imagePart.inlineData.data,
        mimeType:
          imagePart.inlineData.mimeType || "image/png",
      };
    };

    const results = await Promise.all([
      generateOne(),
      generateOne(),
    ]);

    return NextResponse.json({
      images: results,
    });
  } catch (error) {
    console.error("Gemini error:", error);

    return NextResponse.json(
      {
        error: "Gemini APIでエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
