import { NextRequest } from "next/server";
import { AGENTS } from "@/lib/agents";
import { createAnthropicClient } from "@/lib/anthropic";
import { resolveModel } from "@/lib/runtime-config";

export const runtime = "edge";

const REVIEW_CONTEXT = `
## Hypermind for You 서비스 맥락
이 서비스는 팀원의 발표 자료, 보고서, 사업 고민을 점검하기 위한 리뷰 워크스페이스입니다.
답변할 때는 가능하면 아래 항목을 함께 점검하세요.
- 핵심 메시지와 청중 설득력
- 논리 구조와 근거의 빈틈
- 예상 질문, 반대 의견, 리스크
- 바로 적용 가능한 수정 제안
`;

type ImagePayload = { base64: string; mimeType: string };

export async function POST(req: NextRequest) {
  const { agentId, messages, model, password, images } = await req.json();

  if (model && model.includes("opus")) {
    const councilPw = process.env.COUNCIL_ACCESS_PASSWORD;
    if (!councilPw || password !== councilPw) {
      return new Response(JSON.stringify({ error: "Opus 모델은 비밀번호가 필요합니다." }), { status: 403 });
    }
  }

  const modelName = resolveModel(model);

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    return new Response(JSON.stringify({ error: "unknown agent" }), { status: 400 });
  }

  const client = createAnthropicClient();
  if (!client) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), { status: 500 });
  }

  const encoder = new TextEncoder();

  const apiMessages = messages.map((m: { role: string; content: string }, i: number) => {
    if (i === messages.length - 1 && m.role === "user" && images?.length > 0) {
      return {
        role: m.role,
        content: [
          ...images.map((img: ImagePayload) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: img.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: img.base64 },
          })),
          { type: "text" as const, text: m.content },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: modelName,
          max_tokens: 8192,
          system: `${agent.systemPrompt}\n${REVIEW_CONTEXT}`,
          messages: apiMessages,
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err) {
        console.error("Chat error:", err);
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
