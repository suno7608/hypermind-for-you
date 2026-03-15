function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans KR', sans-serif; background: #f8f9fc; color: #1a1a2e; line-height: 1.8; padding: 40px 20px; }
  .container { max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #6c5ce7; }
  .header h1 { font-size: 1.6rem; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
  .header .meta { font-size: 0.85rem; color: #5a5a72; }
  .agent-section { background: #fff; border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid #ccc; }
  .agent-section.omega { border-left-color: #6c5ce7; }
  .agent-section.psi { border-left-color: #e17055; }
  .agent-section.arbiter { border-left-color: #0984e3; }
  .agent-section.delta { border-left-color: #00b894; }
  .agent-section.user { border-left-color: #a29bfe; background: #f0efff; }
  .agent-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .agent-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 1.1rem; }
  .agent-icon.omega { background: #6c5ce7; }
  .agent-icon.psi { background: #e17055; }
  .agent-icon.arbiter { background: #0984e3; }
  .agent-icon.delta { background: #00b894; }
  .agent-icon.user { background: #a29bfe; }
  .agent-name { font-weight: 600; font-size: 1rem; }
  .agent-role { font-size: 0.8rem; color: #5a5a72; margin-left: 8px; }
  .content { font-size: 0.92rem; color: #2d2d44; }
  .content h1 { font-size: 1.3rem; font-weight: 700; margin: 24px 0 12px; color: #1a1a2e; border-bottom: 2px solid #eee; padding-bottom: 8px; }
  .content h2 { font-size: 1.15rem; font-weight: 700; margin: 20px 0 10px; color: #1a1a2e; }
  .content h3 { font-size: 1.02rem; font-weight: 600; margin: 16px 0 8px; color: #1a1a2e; }
  .content p { margin-bottom: 12px; }
  .content strong { color: #1a1a2e; font-weight: 600; }
  .content ul, .content ol { margin: 12px 0 12px 24px; }
  .content li { margin-bottom: 6px; }
  .content blockquote { border-left: 3px solid #6c5ce7; background: #f3f0ff; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; font-style: italic; }
  .content code { background: #eef0f5; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; font-family: monospace; }
  .content pre { background: #1a1a2e; color: #e4e4e7; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
  .content pre code { background: none; color: inherit; padding: 0; }
  .content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.88rem; }
  .content th { background: #eef0f5; padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #d8dae5; }
  .content td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .content tr:hover td { background: #f8f9fc; }
  .content hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8rem; color: #999; }
  @media print { body { padding: 20px; } .agent-section { box-shadow: none; border: 1px solid #eee; } }
</style>
</head>
<body>
<div class="container">
${body}
<div class="footer">Hypermind for You — Generated ${new Date().toLocaleString("ko-KR")}</div>
</div>
</body>
</html>`;
}

function mdToHtml(md: string): string {
  // Simple markdown to HTML (handles common patterns)
  let html = md
    // Code blocks first
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Tables
    .replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, header, rows) => {
      const ths = header.split('|').filter((s: string) => s.trim()).map((s: string) => `<th>${s.trim()}</th>`).join('');
      const trs = rows.trim().split('\n').map((row: string) => {
        const tds = row.split('|').filter((s: string) => s.trim()).map((s: string) => `<td>${s.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    })
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // HR
    .replace(/^---$/gm, '<hr>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*?<\/li>(?:<br>)?)+)/g, '<ul>$1</ul>');
  html = html.replace(/<ul><br>/g, '<ul>').replace(/<br><\/ul>/g, '</ul>');

  return `<p>${html}</p>`.replace(/<p><\/p>/g, '').replace(/<p><h/g, '<h').replace(/<\/h(\d)><\/p>/g, '</h$1>');
}

export function downloadHtml(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const AGENT_META: Record<string, { icon: string; name: string; role: string }> = {
  omega: { icon: "Ω", name: "Omega", role: "초차원 통찰" },
  psi: { icon: "Ψ", name: "Psi", role: "초절정 비평" },
  arbiter: { icon: "⚖", name: "Arbiter", role: "종합 중재관" },
  delta: { icon: "Δ", name: "Delta", role: "9차원 검증관" },
};

export function downloadSingleAgent(agentId: string, content: string, topic?: string) {
  const agent = AGENT_META[agentId] || { icon: "?", name: agentId, role: "" };
  const date = new Date().toISOString().slice(0, 10);

  const body = `
    <div class="header">
      <h1>${agent.icon} ${agent.name} — ${agent.role}</h1>
      <div class="meta">${topic ? `주제: ${topic} · ` : ""}${date}</div>
    </div>
    <div class="agent-section ${agentId}">
      <div class="content">${mdToHtml(content)}</div>
    </div>`;

  downloadHtml(`${date}_${agent.name}.html`, wrapHtml(`${agent.name} — ${agent.role}`, body));
}

export function downloadFullDebate(topic: string, agents: { agent: string; content: string }[]) {
  const date = new Date().toISOString().slice(0, 10);

  let sections = "";
  for (const a of agents) {
    const meta = AGENT_META[a.agent] || { icon: "?", name: a.agent, role: "" };
    sections += `
    <div class="agent-section ${a.agent}">
      <div class="agent-header">
        <div class="agent-icon ${a.agent}">${meta.icon}</div>
        <span class="agent-name">${meta.name}</span>
        <span class="agent-role">${meta.role}</span>
      </div>
      <div class="content">${mdToHtml(a.content)}</div>
    </div>`;
  }

  const body = `
    <div class="header">
      <h1>🏛️ Hypermind for You Council 최종 검증 보고서</h1>
      <div class="meta">주제: ${topic} · ${date}</div>
    </div>
    ${sections}`;

  const safeTopic = topic.slice(0, 20).replace(/[\\/:*?"<>|\n\r]/g, "").trim() || "debate";
  downloadHtml(`${date}_HypermindForYou_Council_${safeTopic}.html`, wrapHtml("Hypermind for You Council 최종 검증 보고서", body));
}

export function downloadChat(agentId: string, messages: { role: string; content: string }[]) {
  const agent = AGENT_META[agentId] || { icon: "?", name: agentId, role: "" };
  const date = new Date().toISOString().slice(0, 10);

  let sections = "";
  for (const msg of messages) {
    if (msg.role === "user") {
      sections += `
      <div class="agent-section user">
        <div class="agent-header">
          <div class="agent-icon user">👤</div>
          <span class="agent-name">사용자</span>
        </div>
        <div class="content">${mdToHtml(msg.content)}</div>
      </div>`;
    } else {
      sections += `
      <div class="agent-section ${agentId}">
        <div class="agent-header">
          <div class="agent-icon ${agentId}">${agent.icon}</div>
          <span class="agent-name">${agent.name}</span>
          <span class="agent-role">${agent.role}</span>
        </div>
        <div class="content">${mdToHtml(msg.content)}</div>
      </div>`;
    }
  }

  const body = `
    <div class="header">
      <h1>${agent.icon} ${agent.name} — 1:1 리뷰</h1>
      <div class="meta">${date}</div>
    </div>
    ${sections}`;

  downloadHtml(`${date}_${agent.name}_review.html`, wrapHtml(`${agent.name} 리뷰`, body));
}
