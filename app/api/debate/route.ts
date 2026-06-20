import { NextRequest } from "next/server";
import { AGENTS } from "@/lib/agents";
import { insertDebate } from "@/lib/db";
import { createAnthropicClient } from "@/lib/anthropic";
import { resolveModel } from "@/lib/runtime-config";
import { randomUUID } from "crypto";

const AGENT_ORDER = ["omega", "psi", "arbiter", "delta"];

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
    return `${REVIEW_CONTEXT}

[검토 대상]
${topic}

위 내용을 발표 자료, 보고서, 사업 판단 메모 중 하나로 보고 분석해주세요.
사용자가 미처 보지 못한 프레임 전환, 설득 포인트, 기회 구조를 중심으로 제안해주세요.`;
  }

  if (agentId === "psi") {
    return `${REVIEW_CONTEXT}

[검토 대상]
${truncate(topic, 15000)}

[Omega의 분석]
${truncate(prev["omega"])}

위 내용을 비판적으로 검토해주세요.
청중이 공격할 지점, 논리적 비약, 근거 부족, 실행 불가능한 전제를 우선적으로 지적해주세요.`;
  }

  if (agentId === "arbiter") {
    return `${REVIEW_CONTEXT}

[검토 대상]
${truncate(topic, 10000)}

[Omega의 분석]
${truncate(prev["omega"], 8000)}

[Psi의 비판]
${truncate(prev["psi"], 8000)}

양측 의견을 종합해 사용자가 실제로 수정해야 할 우선순위와 최종 권고안을 정리해주세요.`;
  }

  return `${REVIEW_CONTEXT}

[검토 대상 요약]
${truncate(topic, 6000)}

[Arbiter의 종합 권고안]
${truncate(prev["arbiter"], 10000)}

위 결과를 9차원으로 검증해주세요.
발표 또는 공유 전에 남아 있는 리스크와 추가 수정 사항을 분명하게 알려주세요.`;
}

type ImagePayload = { base64: string; mimeType: string };

function buildMessageContent(prompt: string, images?: ImagePayload[]) {
  if (!images || images.length === 0) return prompt;
  return [
    ...images.map((img) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: img.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: img.base64 },
    })),
    { type: "text" as const, text: prompt },
  ];
}

export async function POST(req: NextRequest) {
  const { topic, password, model, saveOnly, agents, userPin, images } = await req.json();
  const councilAccessPassword = process.env.COUNCIL_ACCESS_PASSWORD;

  if (saveOnly && agents) {
    if (!councilAccessPassword || password !== councilAccessPassword) {
      return new Response(JSON.stringify({ error: "Council final review password is invalid" }), { status: 403 });
    }
    const debateId = randomUUID();
    try {
      await insertDebate(debateId, topic, agents, userPin);
      return new Response(JSON.stringify({ debateId }), { status: 200 });
    } catch (e) {
      console.error("DB save failed:", e);
      return new Response(JSON.stringify({ error: "DB save failed" }), { status: 500 });
    }
  }

  if (model && String(model).includes("opus")) {
    if (!councilAccessPassword || password !== councilAccessPassword) {
      return new Response(JSON.stringify({ error: "Opus 모델은 비밀번호가 필요합니다." }), { status: 403 });
    }
  }

  const modelName = resolveModel(model);
  if (!topic || typeof topic !== "string") {
    return new Response(JSON.stringify({ error: "topic is required" }), { status: 400 });
  }

  const client = createAnthropicClient();
  if (!client) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const debateId = randomUUID();
  const agentOutputs: Record<string, string> = {};
  const agentResults: { agent: string; content: string; done: boolean }[] = [];

  const readable = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }
      try {
        for (const agentId of AGENT_ORDER) {
          const agent = AGENTS.find((a) => a.id === agentId);
          if (!agent) continue;
          const userPrompt = buildPrompt(agentId, topic, agentOutputs);
          send({ type: "start", agent: agentId, content: "" });
          let fullContent = "";
          const stream = client.messages.stream({
            model: modelName,
            max_tokens: 8192,
            system: agent.systemPrompt,
            messages: [{ role: "user", content: buildMessageContent(userPrompt, agentId === "omega" ? images : undefined) }],
          });
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullContent += event.delta.text;
              send({ type: "chunk", agent: agentId, content: fullContent });
            }
          }
          agentOutputs[agentId] = fullContent;
          agentResults.push({ agent: agentId, content: fullContent, done: true });
          send({ type: "done", agent: agentId, content: fullContent });
        }
        try {
          await insertDebate(debateId, topic, agentResults);
        } catch (e) {
          console.error("DB save failed:", e);
        }
        send({ type: "complete", debateId });
      } catch (err) {
        console.error("Debate stream error:", err);
        send({ type: "error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
