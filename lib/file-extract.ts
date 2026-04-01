/**
 * 클라이언트 측 파일 텍스트 추출
 * - PPTX: JSZip으로 브라우저에서 직접 처리 (크기 제한 없음)
 * - TXT/MD/CSV: FileReader로 직접 읽기
 * - PDF/DOCX/PPT: 서버 /api/upload로 폴백 (4MB 이하만)
 */

export async function extractTextFromFile(file: File): Promise<{ text: string; filename: string }> {
  const name = file.name.toLowerCase();

  // 텍스트 파일: 브라우저에서 직접
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
    const text = await file.text();
    return { text: text.slice(0, 50000), filename: file.name };
  }

  // PPTX: 브라우저에서 JSZip으로 직접 처리 (크기 제한 없음)
  if (name.endsWith('.pptx')) {
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
    const text = texts.join('\n\n');
    if (!text.trim()) throw new Error('PPTX에서 텍스트를 추출할 수 없습니다.');
    return { text: text.slice(0, 50000), filename: file.name };
  }

  // PDF, DOCX, PPT: 서버로 전송 (4MB 제한)
  if (file.size > 4 * 1024 * 1024) {
    if (name.endsWith('.ppt')) {
      throw new Error('PPT 파일이 4MB를 초과합니다.\n\nPowerPoint에서 .pptx로 다시 저장하면 크기 제한 없이 업로드 가능합니다.');
    }
    throw new Error('파일 크기가 4MB를 초과합니다.\n\nPPTX 형식은 크기 제한 없이 업로드 가능합니다.');
  }

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
