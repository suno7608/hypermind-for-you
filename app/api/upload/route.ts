import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import * as CFB from "cfb";

// Next.js App Router: body size limit 확장 + 타임아웃
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/** 구형 .ppt (OLE2/Compound Binary) 텍스트 추출 */
function extractPptText(buffer: Buffer): string {
  try {
    const cfb = CFB.read(buffer, { type: "buffer" });
    // PowerPoint Document 스트림에서 UTF-16LE 텍스트 추출
    const entry =
      CFB.find(cfb, "/PowerPoint Document") ||
      CFB.find(cfb, "PowerPoint Document");
    if (!entry || !entry.content) return "";

    const raw = Buffer.from(entry.content);
    const texts: string[] = [];

    // TextBytesAtom (type=0x0FA8) 또는 TextCharsAtom (type=0x0FA0) 파싱
    let i = 0;
    while (i < raw.length - 8) {
      const recType = raw.readUInt16LE(i + 2);
      const recLen = raw.readUInt32LE(i + 4);

      if (recType === 0x0fa0 && recLen > 0 && recLen < 100000) {
        // TextCharsAtom — UTF-16LE
        const end = Math.min(i + 8 + recLen, raw.length);
        const str = raw.subarray(i + 8, end).toString("utf16le").trim();
        if (str && !/^[\x00-\x1F]+$/.test(str)) texts.push(str);
      } else if (recType === 0x0fa8 && recLen > 0 && recLen < 100000) {
        // TextBytesAtom — Latin1
        const end = Math.min(i + 8 + recLen, raw.length);
        const str = raw.subarray(i + 8, end).toString("latin1").trim();
        if (str && !/^[\x00-\x1F]+$/.test(str)) texts.push(str);
      }

      i += 8 + recLen;
      if (recLen === 0) i += 1; // prevent infinite loop
    }

    return texts.join("\n\n");
  } catch {
    return "";
  }
}

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

    const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기가 4MB를 초과합니다.' }, { status: 400 });
    }

    let text = "";

    if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
      text = buffer.toString("utf-8");
    } else if (name.endsWith(".pdf")) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const result = await pdfParse(buffer);
        text = result.text;
      } catch (pdfErr) {
        return NextResponse.json(
          { error: 'PDF 파일을 읽을 수 없습니다. 파일이 손상되었거나 암호로 보호되어 있을 수 있습니다.' },
          { status: 400 }
        );
      }
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".pptx")) {
      text = await extractPptxText(buffer);
    } else if (name.endsWith(".ppt")) {
      text = extractPptText(buffer);
      if (!text.trim()) {
        return NextResponse.json(
          { error: "구형 PPT 파일에서 텍스트를 추출할 수 없습니다. PPTX로 변환 후 다시 시도해주세요.\n\n변환 방법: PowerPoint에서 열기 → 다른 이름으로 저장 → .pptx 선택" },
          { status: 400 }
        );
      }
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
    const message = err instanceof SyntaxError
      ? '파일 형식을 처리할 수 없습니다. 다른 형식으로 변환 후 다시 시도해주세요.'
      : err instanceof TypeError
        ? '파일 처리 중 오류가 발생했습니다. 파일이 손상되었을 수 있습니다.'
        : '파일 업로드 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
