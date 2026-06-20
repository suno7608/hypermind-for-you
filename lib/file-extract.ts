/**
 * 클라이언트 측 파일 처리 — 텍스트 추출 + 이미지 변환
 * 텍스트: 50MB, 이미지: 20MB
 */

export type ProcessedFile =
  | { type: "text"; name: string; text: string }
  | { type: "image"; name: string; base64: string; mimeType: string };

const MAX_CLIENT_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TEXT_LENGTH = 50000;
const MAX_IMAGE_DIMENSION = 1568;

const IMAGE_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".heic", ".heif", ".tiff", ".tif", ".bmp", ".avif", ".svg",
];

function isImageFile(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return file.type.startsWith("image/") || IMAGE_EXTENSIONS.some(ext => name.endsWith(ext));
}

function isHeic(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") ||
    file.type === "image/heic" || file.type === "image/heif";
}

async function processImage(file: File): Promise<{ base64: string; mimeType: string }> {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("이미지 크기가 20MB를 초과합니다.");
  }

  let blob: Blob = file;

  if (isHeic(file)) {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    blob = Array.isArray(result) ? result[0] : result;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽을 수 없습니다."));
    };
    img.src = url;
  });
}

export async function processFile(file: File): Promise<ProcessedFile> {
  if (isImageFile(file)) {
    const { base64, mimeType } = await processImage(file);
    return { type: "image", name: file.name, base64, mimeType };
  }
  const { text, filename } = await extractTextFromFile(file);
  return { type: "text", name: filename, text };
}

export async function extractTextFromFile(file: File): Promise<{ text: string; filename: string }> {
  const name = file.name.toLowerCase();

  if (file.size > MAX_CLIENT_SIZE) {
    throw new Error('파일 크기가 50MB를 초과합니다.');
  }

  let text = '';

  // 텍스트 파일
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
    text = await file.text();
  }
  // PPTX: JSZip (크기 제한 없음)
  else if (name.endsWith('.pptx')) {
    text = await extractPptx(file);
  }
  // DOCX: JSZip (크기 제한 없음)
  else if (name.endsWith('.docx')) {
    text = await extractDocx(file);
  }
  // PDF: pdfjs-dist (크기 제한 없음)
  else if (name.endsWith('.pdf')) {
    text = await extractPdf(file);
  }
  // PPT(구형): CFB로 브라우저에서 직접 처리
  else if (name.endsWith('.ppt')) {
    text = await extractPpt(file);
  }
  else {
    throw new Error(`지원하지 않는 형식입니다: ${name.split('.').pop()}\n\n지원: PDF, PPTX, DOCX, PPT, TXT, MD, CSV`);
  }

  if (!text.trim()) throw new Error('파일에서 텍스트를 추출할 수 없습니다.');
  return { text: text.slice(0, MAX_TEXT_LENGTH), filename: file.name };
}

/** PPTX → 텍스트 (브라우저) */
async function extractPptx(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideFiles = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });
  const texts: string[] = [];
  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async('string');
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').trim();
    if (slideText) {
      const slideNum = slidePath.match(/slide(\d+)/)?.[1];
      texts.push('[슬라이드 ' + slideNum + ']\n' + slideText);
    }
  }
  return texts.join('\n\n');
}

/** DOCX → 텍스트 (브라우저) */
async function extractDocx(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const docXml = zip.files['word/document.xml'];
  if (!docXml) throw new Error('DOCX 파일을 읽을 수 없습니다.');
  const xml = await docXml.async('string');
  // <w:t> 태그에서 텍스트 추출
  const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const paragraphs: string[] = [];
  let current = '';
  // <w:p> 기준으로 줄바꿈 처리
  const parts = xml.split(/<\/w:p>/);
  for (const part of parts) {
    const tMatches = part.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const line = tMatches.map(m => m.replace(/<[^>]+>/g, '')).join('');
    if (line.trim()) paragraphs.push(line);
  }
  return paragraphs.join('\n');
}

/** PDF → 텍스트 (브라우저, pdfjs-dist) */
async function extractPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  // pdf.js worker 설정
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
  
  const texts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = content.items
      .map((item: any) => item.str || '')
      .join(' ')
      .trim();
    if (pageText) texts.push(pageText);
  }
  return texts.join('\n\n');
}

/** PPT(구형) → 텍스트 (브라우저, CFB + 멀티 전략) */
async function extractPpt(file: File): Promise<string> {
  const CFB = await import('cfb');
  const buffer = new Uint8Array(await file.arrayBuffer());
  const cfb = CFB.read(buffer, { type: "array" });

  // 전략 1: PowerPoint Document 스트림의 TextAtom 파싱
  const entry =
    CFB.find(cfb, "/PowerPoint Document") ||
    CFB.find(cfb, "PowerPoint Document");

  let texts: string[] = [];

  if (entry?.content) {
    texts = parsePptRecords(entry.content);
  }

  // 전략 2: Current User 외 모든 스트림에서 TextAtom 탐색
  if (!texts.length) {
    for (const fe of cfb.FileIndex) {
      if (!fe.content || fe.name === 'Current User' || fe.name === '\u0005DocumentSummaryInformation' || fe.name === '\u0005SummaryInformation') continue;
      const found = parsePptRecords(fe.content);
      if (found.length > texts.length) texts = found;
    }
  }

  // 전략 3: 바이너리 전체에서 UTF-16LE 텍스트 직접 추출 (한글 포함)
  if (!texts.length) {
    texts = extractUnicodeStrings(buffer);
  }

  if (!texts.length) {
    throw new Error('PPT 파일에서 텍스트를 추출할 수 없습니다.\n\n.pptx로 변환 후 다시 시도해주세요.');
  }
  return texts.join('\n\n');
}

/** PPT 레코드에서 TextCharsAtom/TextBytesAtom 추출 */
function parsePptRecords(raw: Uint8Array | number[]): string[] {
  const texts: string[] = [];
  let i = 0;
  const len = raw.length;
  while (i < len - 8) {
    const recType = raw[i + 2] | (raw[i + 3] << 8);
    const recLen = raw[i + 4] | (raw[i + 5] << 8) | (raw[i + 6] << 16) | (raw[i + 7] << 24);

    if (recLen < 0 || recLen > 10000000) { i += 1; continue; }

    if (recType === 0x0fa0 && recLen > 0 && recLen < 200000) {
      // TextCharsAtom — UTF-16LE (한글 등 유니코드)
      const end = Math.min(i + 8 + recLen, len);
      let str = '';
      for (let j = i + 8; j < end - 1; j += 2) {
        str += String.fromCharCode(raw[j] | (raw[j + 1] << 8));
      }
      str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
      if (str.length > 1) texts.push(str);
    } else if (recType === 0x0fa8 && recLen > 0 && recLen < 200000) {
      // TextBytesAtom — Latin1/ASCII
      const end = Math.min(i + 8 + recLen, len);
      let str = '';
      for (let j = i + 8; j < end; j++) {
        str += String.fromCharCode(raw[j]);
      }
      str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
      if (str.length > 1) texts.push(str);
    }

    i += 8 + recLen;
    if (recLen === 0) i += 1;
  }
  return texts;
}

/** 바이너리에서 UTF-16LE 유니코드 문자열 직접 추출 (한글/CJK 포함) */
function extractUnicodeStrings(raw: Uint8Array): string[] {
  const texts: string[] = [];
  const len = raw.length;
  let current = '';
  
  for (let i = 0; i < len - 1; i += 2) {
    const code = raw[i] | (raw[i + 1] << 8);
    // 출력 가능한 문자: 공백, ASCII 가시문자, 한글(AC00-D7AF), CJK, 일본어 등
    const isPrintable = 
      code === 0x0A || code === 0x0D || // 줄바꿈
      (code >= 0x20 && code <= 0x7E) || // ASCII
      (code >= 0xAC00 && code <= 0xD7AF) || // 한글 음절
      (code >= 0x3131 && code <= 0x318E) || // 한글 자모
      (code >= 0x4E00 && code <= 0x9FFF) || // CJK
      (code >= 0x3040 && code <= 0x30FF) || // 히라가나/카타카나
      (code >= 0x00A0 && code <= 0x024F) || // Latin Extended
      (code >= 0x2000 && code <= 0x206F) || // 일반 구두점
      (code >= 0xFF01 && code <= 0xFF5E);   // 전각
      
    if (isPrintable) {
      current += String.fromCharCode(code);
    } else {
      if (current.trim().length >= 4) {
        // 최소 4자 이상, 한글이나 의미있는 텍스트가 포함된 경우만
        const trimmed = current.trim();
        if (/[가-힣a-zA-Z]/.test(trimmed)) {
          texts.push(trimmed);
        }
      }
      current = '';
    }
  }
  if (current.trim().length >= 4 && /[가-힣a-zA-Z]/.test(current.trim())) {
    texts.push(current.trim());
  }
  
  return texts;
}

/** 서버 폴백 (미지원 형식 등) */
async function uploadToServer(file: File): Promise<{ text: string; filename: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const errText = await res.text();
    throw new Error('서버 오류: ' + errText.slice(0, 200));
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '파일 업로드 실패');
  return { text: data.text, filename: data.filename };
}
