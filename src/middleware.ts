import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/api/register", "/api/orders"];

export default auth(async function middleware(
  req: NextRequest & { auth: unknown }
) {
  const { pathname } = req.nextUrl;

  // Storefront é público: /[qualquer-slug]
  // Ignora rotas de API públicas, login, register
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    (pathname.split("/").length === 2 &&
      !pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/api"));

  if (isPublic) return NextResponse.next();

  const session = (req as unknown as { auth: { user?: unknown } | null }).auth;

  if (!session && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
