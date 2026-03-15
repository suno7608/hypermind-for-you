import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
      return numA - numB;
    });

  const texts: string[] = [];
  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async("string");
    // <a:t> 태그에서 텍스트 추출
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const slideText = matches
      .map((m) => m.replace(/<[^>]+>/g, ""))
      .join(" ")
      .trim();
    if (slideText) {
      const slideNum = slidePath.match(/slide(\d+)/)?.[1];
      texts.push(`[슬라이드 ${slideNum}]\n${slideText}`);
    }
  }
  return texts.join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
      text = buffer.toString("utf-8");
    } else if (name.endsWith(".pdf")) {
      // pdf-parse v1 is CommonJS — use require
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".pptx") || name.endsWith(".ppt")) {
      text = await extractPptxText(buffer);
    } else {
      return NextResponse.json(
        { error: `지원하지 않는 형식입니다: ${name.split(".").pop()}\n지원: PDF, DOCX, PPTX, TXT, MD, CSV` },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "파일에서 텍스트를 추출할 수 없습니다" }, { status: 400 });
    }

    // 50000자 제한
    if (text.length > 50000) {
      text = text.slice(0, 50000);
    }

    return NextResponse.json({ text, filename: file.name, chars: text.length });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
