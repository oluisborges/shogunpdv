import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Next.js 16: "middleware" foi renomeado para "proxy"
// Roda em Node.js runtime (não Edge) — suporta Prisma e Node APIs

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apenas protege rotas do dashboard
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // getToken lê o JWT do cookie — sem banco de dados
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
