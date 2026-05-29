import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/meta/:path*",
    "/api/projects/:path*",
    "/api/tasks/:path*",
    "/api/leads/:path*",
    "/api/briefs/:path*",
    "/api/posts/:path*",
    "/api/workspace/:path*",
  ],
};
