"use client";

import { useEffect, useRef, useState } from "react";

const LP_URL = "https://あなたのLPのURL";

const bgOptions = [
  { name: "白", value: "白", color: "#ffffff" },
  { name: "水色", value: "水色", color: "#dff4ff" },
  { name: "グレー", value: "グレー", color: "#eef2f7" },
  { name: "ブルー", value: "ブルー", color: "#dbeafe" },
];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [uploadedImage, setUploadedImage] = useState("");
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [bgColor, setBgColor] = useState("白");
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [generateError, setGenerateError] = useState("");

  useEffect(() => {
    const access = localStorage.getItem("photoToolAccess");

    if (access !== "ok") {
      // 本番時にコメント解除
      // window.location.href = LP_URL;
    }
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setUploadError("");
    setGenerateError("");
    setGeneratedImages([]);
    setSelectedImage("");
    setUploadedImage("");
  
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
  
    const isHeic =
      fileType.includes("heic") ||
      fileType.includes("heif") ||
      fileName.endsWith(".heic") ||
      fileName.endsWith(".heif");
  
    const isJpg =
      fileType === "image/jpeg" ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg");
  
    const isPng = fileType === "image/png" || fileName.endsWith(".png");
    const isWebp = fileType === "image/webp" || fileName.endsWith(".webp");
  
    const isSupported = isJpg || isPng || isWebp || isHeic;
  
    if (!isSupported) {
      setUploadError(
        "この画像形式は対応していません。JPG、PNG、WEBP、HEIC形式の写真を選択してください。"
      );
      return;
    }
  
    try {
      if (isHeic) {
        const formData = new FormData();
        formData.append("file", file);
  
        const res = await fetch("/api/convert-heic", {
          method: "POST",
          body: formData,
        });
  
        const data = await res.json();
  
        if (!res.ok) {
          throw new Error(data.error || "HEIC画像の変換に失敗しました。");
        }
  
        setMimeType(data.mimeType || "image/jpeg");
        setUploadedImage(`data:${data.mimeType};base64,${data.imageBase64}`);
        return;
      }
  
      setMimeType(file.type || "image/jpeg");
  
      const reader = new FileReader();
  
      reader.onload = () => {
        setUploadedImage(reader.result as string);
      };
  
      reader.onerror = () => {
        setUploadError("画像の読み込みに失敗しました。別の写真でお試しください。");
      };
  
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "画像の読み込みに失敗しました。別の写真でお試しください。"
      );
    }
  };

  const generatePhoto = async () => {
    if (!uploadedImage) {
      setGenerateError("先に写真をアップロードしてください。");
      return;
    }

    setLoading(true);
    setGenerateError("");
    setGeneratedImages([]);
    setSelectedImage("");

    try {
      const base64 = uploadedImage.split(",")[1];

      const res = await fetch("/api/generate-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          bgColor,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成に失敗しました。");
      }

      const images = data.images.map(
        (img: { mimeType: string; imageBase64: string }) =>
          `data:${img.mimeType};base64,${img.imageBase64}`
      );

      setGeneratedImages(images);
      setSelectedImage(images[0]);
      drawToCanvas(images[0]);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "エラーが発生しました。"
      );
    } finally {
      setLoading(false);
    }
  };

  const drawToCanvas = (src: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();

    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = 900;
      const height = 1200;

      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      const targetRatio = width / height;
      const imgRatio = img.width / img.height;

      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;

      if (imgRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
    };

    img.src = src;
  };

  const selectImage = (src: string) => {
    setSelectedImage(src);
    drawToCanvas(src);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedImage) return;

    const link = document.createElement("a");
    link.download = "ai-shomei-photo.jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff4ff_0,#f8fbff_38%,#ffffff_100%)] pb-28 text-slate-900">
      <div className="mx-auto max-w-md px-4 pt-6">
        <header className="mb-6">
          <p className="text-xs font-bold tracking-[0.25em] text-blue-700">
            AI ツール
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight">
            就活証明写真メーカー
          </h1>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            自分の写真から、履歴書やESに使いやすい証明写真をAIで作成できます。
          </p>
        </header>

        <section className="mb-5 overflow-hidden rounded-[30px] bg-white/80 shadow-xl shadow-sky-100 backdrop-blur">
          <div className="relative p-6">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-200/60 blur-2xl" />
            <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-blue-100/80 blur-2xl" />

            <div className="relative">
              <p className="mb-2 text-xs font-bold text-blue-700">
                写真館に行かずに作成
              </p>
              <h2 className="text-2xl font-black leading-tight">
                AIで2枚生成して
                <br />
                好きな方を保存
              </h2>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                生成された2枚の候補から、印象が良い方を選んでダウンロードできます。
              </p>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-black">写真を選択</h3>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
              STEP 01
            </span>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/70 p-7 text-center transition hover:bg-sky-100">
            <span className="mb-2 text-sm font-black">写真をアップロード</span>
            <span className="text-xs text-slate-500">
              JPG / PNG / WEBP / HEIC 対応
            </span>
            <input
              type="file"
              accept="image/*,.heic,.heif"
              onChange={handleUpload}
              className="hidden"
            />
          </label>

          {uploadError && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-600">
              {uploadError}
            </div>
          )}

          {uploadedImage && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold text-slate-500">
                アップロード画像
              </p>
              <img
                src={uploadedImage}
                alt="アップロード画像"
                className="mx-auto max-h-[260px] rounded-3xl border bg-white object-contain shadow-sm"
              />
            </div>
          )}
        </section>

        <section className="mb-5 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-black">背景カラー</h3>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
              OPTION
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {bgOptions.map((item) => (
              <button
                key={item.value}
                onClick={() => setBgColor(item.value)}
                className={`rounded-3xl border-2 p-3 transition ${
                  bgColor === item.value
                    ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span
                  className="mx-auto mb-2 block h-10 w-10 rounded-full border"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-[11px] font-black">{item.name}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-black">生成候補を選択</h3>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
              STEP 02
            </span>
          </div>

          {loading && (
            <div className="rounded-3xl bg-sky-50 p-5 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-blue-600" />
              <p className="text-sm font-black text-slate-700">
                AIで証明写真を生成中...
              </p>
              <p className="mt-2 text-xs text-slate-500">
                2枚の候補を作成しています
              </p>
            </div>
          )}

          {generateError && (
            <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-600">
              {generateError}
            </div>
          )}

          {!loading && generatedImages.length === 0 && (
            <p className="rounded-3xl bg-slate-50 p-5 text-center text-xs text-slate-500">
              写真と背景カラーを選択して、下のボタンからAI生成してください。
            </p>
          )}

          {generatedImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {generatedImages.map((src, index) => (
                <button
                  key={index}
                  onClick={() => selectImage(src)}
                  className={`rounded-3xl border-2 p-2 transition ${
                    selectedImage === src
                      ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-100"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <img
                    src={src}
                    alt={`生成候補${index + 1}`}
                    className="aspect-[3/4] w-full rounded-2xl object-cover"
                  />
                  <p className="mt-2 text-xs font-black">候補 {index + 1}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mb-5 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-black">完成イメージ</h3>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
              STEP 03
            </span>
          </div>

          <div className="flex justify-center rounded-3xl bg-slate-100 p-4">
            <canvas
              ref={canvasRef}
              className="aspect-[3/4] w-full max-w-[260px] rounded-2xl bg-white shadow-md"
            />
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/70 bg-white/90 px-4 py-4 shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3">
          <button
            onClick={generatePhoto}
            disabled={!uploadedImage || loading}
            className="flex-1 rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black text-white shadow-lg shadow-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {loading ? "生成中..." : "AIで2枚生成"}
          </button>

          <button
            onClick={downloadImage}
            disabled={!selectedImage}
            className="flex-1 rounded-2xl bg-slate-900 px-4 py-4 text-sm font-black text-white shadow-lg shadow-slate-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            保存する
          </button>
        </div>
      </div>
    </main>
  );
}
