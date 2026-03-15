import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Regular PIN validation (just check it's 4+ chars)
  if (!pin || typeof pin !== "string" || pin.length < 4) {
    return Response.json({ error: "PIN은 4자리 이상이어야 합니다." }, { status: 400 });
  }

  const isAdmin = adminPassword ? pin === adminPassword : false;
  return Response.json({ ok: true, admin: isAdmin });
}
