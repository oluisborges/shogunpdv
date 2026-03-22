import { withAuth } from "next-auth/middleware";

// withAuth lê apenas o JWT cookie — sem Prisma, compatível com Edge Runtime
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
