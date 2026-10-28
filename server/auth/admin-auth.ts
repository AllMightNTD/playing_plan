import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import { AppError, ERRORS } from "@/server/http/errors";

const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export interface AdminIdentity {
  email: string;
}

export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

/** Mục 13.8: chỉ email đã xác minh và nằm trong allowlist mới đăng nhập được CMS. */
export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: ADMIN_SESSION_MAX_AGE_SECONDS },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    signIn({ user, profile }) {
      const isEmailVerified = (profile as GoogleProfile | undefined)?.email_verified === true;
      return isEmailVerified && isAllowedAdminEmail(user.email);
    },
  },
};

/** Guard mọi route `/api/v1/admin/*`: chưa đăng nhập → 401, sai allowlist → 403. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new AppError(ERRORS.ADMIN.UNAUTHENTICATED);
  if (!isAllowedAdminEmail(email)) throw new AppError(ERRORS.ADMIN.FORBIDDEN);
  return { email };
}
