import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const councilAccessPassword = process.env.COUNCIL_ACCESS_PASSWORD;

  if (!councilAccessPassword) {
    return new Response(JSON.stringify({ error: "Not configured" }), { status: 503 });
  }

  if (password === councilAccessPassword) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Invalid password" }), { status: 403 });
}
