import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonData, parseJsonBody } from "@/server/http/route";
import { AppError } from "@/server/http/errors";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  getExpectedAdminPassword,
  isAllowedAdminEmail,
  setAdminSessionCookie,
  signAdminToken,
} from "@/server/auth/admin-auth";

const adminLoginSchema = z.object({
  email: z.string().trim().email("Email không đúng định dạng"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const POST = handleRoute(async (req: NextRequest) => {
  const body = await parseJsonBody(req, adminLoginSchema);
  const normalizedEmail = body.email.toLowerCase().trim();

  const expectedPassword = getExpectedAdminPassword();
  if (body.password !== expectedPassword) {
    throw new AppError({
      code: "ADMIN_INVALID_CREDENTIALS",
      status: 401,
      message: "Email hoặc mật khẩu quản trị không chính xác.",
    });
  }

  if (!isAllowedAdminEmail(normalizedEmail)) {
    throw new AppError({
      code: "ADMIN_FORBIDDEN_EMAIL",
      status: 403,
      message: "Tài khoản email này không nằm trong danh sách quản trị viên được cấp phép.",
    });
  }

  const token = signAdminToken(normalizedEmail);

  const res = jsonData({
    token,
    email: normalizedEmail,
    name: "DateMate Admin",
    role: "admin",
    expiresIn: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  setAdminSessionCookie(res, normalizedEmail);
  return res;
});
