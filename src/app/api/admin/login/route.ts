import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const { email, password } = body;
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Faltan email o contraseña" }, { status: 400 });
  }
  const user = await db.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }
  const token = createSessionToken(user.email);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/",
  });
  return res;
}
