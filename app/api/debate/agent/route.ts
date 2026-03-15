import { NextRequest } from "next/server";
import { AGENTS } from "@/lib/agents";
import { createAnthropicClient } from "@/lib/anthropic";
import { resolveModel } from "@/lib/runtime-config";

function truncate(text: string, maxChars: number = 12000): string {
  if (text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2);
  return text.slice(0, half) + "\n\n[... 중간 생략 ...]\n\n" + text.slice(-half);
}

const REVIEW_CONTEXT = `
이 서비스는 팀원의 발표 자료, 보고서, 사업 고민을 점검하기 위한 멀티 에이전트 리뷰 워크스페이스입니다.
각 에이전트는 자신의 역할을 유지하되, 아래 항목을 결과에 반영하세요.
- 핵심 메시지가 청중 또는 의사결정자에게 충분히 전달되는가
- 논리 구조와 근거의 빈틈은 어디인가
- 예상 질문, 반대 의견, 실행 리스크는 무엇인가
- 사용자가 바로 수정할 수 있는 액션 아이템은 무엇인가
`;

function buildPrompt(agentId: string, topic: string, prev: Record<string, string>): string {
  if (agentId === "omega") {
    return `${REVIEW_CONTEXT}\n\n[검토 대상]\n${topic}\n\n위 내용을 발표 자료, 보고서, 사업 판단 메모 중 하나로 보고 분석해주세요.\n사용자가 미처 보지 못한 프레임 전환, 설득 포인트, 기회 구조를 중심으로 제안해주세요.`;
  }
  if (agentId === "psi") {
    return `${REVIEW_CONTEXT}\n\n[검토 대상]\n${truncate(topic, 15000)}\n\n[Omega의 분석]\n${truncate(prev["omega"])}\n\n위 내용을 비판적으로 검토해주세요.\n청중이 공격할 지점, 논리적 비약, 근거 부족, 실행 불가능한 전제를 우선적으로 지적해주세요.`;
  }
  if (agentId === "arbiter") {
    return `${REVIEW_CONTEXT}\n\n[검토 대상]\n${truncate(topic, 10000)}\n\n[Omega의 분석]\n${truncate(prev["omega"], 8000)}\n\n[Psi의 비판]\n${truncate(prev["psi"], 8000)}\n\n양측 의견을 종합해 사용자가 실제로 수정해야 할 우선순위와 최종 권고안을 정리해주세요.`;
  }
  return `${REVIEW_CONTEXT}\n\n[검토 대상 요약]\n${truncate(topic, 6000)}\n\n[Arbiter의 종합 권고안]\n${truncate(prev["arbiter"], 10000)}\n\n위 결과를 9차원으로 검증해주세요.\n발표 또는 공유 전에 남아 있는 리스크와 추가 수정 사항을 분명하게 알려주세요.`;
}

export async function POST(req: NextRequest) {
  const { agentId, topic, prev, password, model } = await req.json();
  const modelName = resolveModel(model);

  const councilAccessPassword = process.env.COUNCIL_ACCESS_PASSWORD;
  if (!councilAccessPassword || password !== councilAccessPassword) {
    return new Response(JSON.stringify({ error: "Invalid password" }), { status: 403 });
  }

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    return new Response(JSON.stringify({ error: "Unknown agent" }), { status: 400 });
  }

  const client = createAnthropicClient();
  if (!client) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), { status: 500 });
  }

  const userPrompt = buildPrompt(agentId, topic, prev || {});
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: modelName,
          max_tokens: 8192,
          system: agent.systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
