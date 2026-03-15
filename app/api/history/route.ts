import { NextRequest, NextResponse } from "next/server";
import { getAllDebates, deleteDebate } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userPin = req.nextUrl.searchParams.get("pin") || undefined;
    const admin = req.nextUrl.searchParams.get("admin") === "true";
    // Admin (no pin filter) sees all; regular users see only their own
    const debates = await getAllDebates(admin ? undefined : userPin);
    return NextResponse.json(debates);
  } catch (err) {
    console.error("History fetch error:", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const ok = await deleteDebate(id);
    return NextResponse.json({ ok });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
