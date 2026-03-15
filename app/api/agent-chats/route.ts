import { NextRequest, NextResponse } from "next/server";
import { getAgentChats, upsertAgentChat, deleteAgentChat } from "@/lib/db";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId") || undefined;
  const userPin = req.nextUrl.searchParams.get("pin") || undefined;
  const admin = req.nextUrl.searchParams.get("admin") === "true";
  return NextResponse.json(await getAgentChats(agentId, admin ? undefined : userPin));
}

export async function POST(req: NextRequest) {
  const { id, agentId, title, messages, userPin } = await req.json();
  if (!id || !agentId) return NextResponse.json({ error: "id, agentId required" }, { status: 400 });
  await upsertAgentChat(id, agentId, title || "리뷰", messages || [], userPin);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  return NextResponse.json({ ok: await deleteAgentChat(id) });
}
