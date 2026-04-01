/**
 * 클라이언트 측 파일 텍스트 추출 — 모든 형식 브라우저에서 직접 처리
 * 크기 제한: 50MB (브라우저 메모리 기준)
 */

const MAX_CLIENT_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_TEXT_LENGTH = 50000;

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

/** PPT(구형) → 텍스트 (브라우저, CFB) */
async function extractPpt(file: File): Promise<string> {
  const CFB = await import('cfb');
  const buffer = new Uint8Array(await file.arrayBuffer());
  const cfb = CFB.read(buffer, { type: "array" });
  const entry =
    CFB.find(cfb, "/PowerPoint Document") ||
    CFB.find(cfb, "PowerPoint Document");
  if (!entry || !entry.content) {
    throw new Error('PPT 파일에서 텍스트를 추출할 수 없습니다.\n\n.pptx로 변환 후 다시 시도해주세요.');
  }

  const raw = entry.content;
  const texts: string[] = [];
  let i = 0;
  while (i < raw.length - 8) {
    const recType = raw[i + 2] | (raw[i + 3] << 8);
    const recLen = raw[i + 4] | (raw[i + 5] << 8) | (raw[i + 6] << 16) | (raw[i + 7] << 24);

    if (recType === 0x0fa0 && recLen > 0 && recLen < 100000) {
      // TextCharsAtom — UTF-16LE
      const end = Math.min(i + 8 + recLen, raw.length);
      const bytes = raw.slice(i + 8, end);
      let str = '';
      for (let j = 0; j < bytes.length - 1; j += 2) {
        str += String.fromCharCode(bytes[j] | (bytes[j + 1] << 8));
      }
      str = str.trim();
      if (str && !/^[\x00-\x1F]+$/.test(str)) texts.push(str);
    } else if (recType === 0x0fa8 && recLen > 0 && recLen < 100000) {
      // TextBytesAtom — Latin1
      const end = Math.min(i + 8 + recLen, raw.length);
      const bytes = raw.slice(i + 8, end);
      let str = '';
      for (let j = 0; j < bytes.length; j++) {
        str += String.fromCharCode(bytes[j]);
      }
      str = str.trim();
      if (str && !/^[\x00-\x1F]+$/.test(str)) texts.push(str);
    }

    i += 8 + recLen;
    if (recLen === 0) i += 1;
  }

  if (!texts.length) {
    throw new Error('PPT 파일에서 텍스트를 추출할 수 없습니다.\n\n.pptx로 변환 후 다시 시도해주세요.');
  }
  return texts.join('\n\n');
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
