import { db } from "../db";
import { hashPassword, comparePassword } from "../utils/auth";
import type { User } from "../types";

export const ensureSeedAdmin = async (): Promise<void> => {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  const fullName = process.env.ADMIN_SEED_NAME ?? "Seed Admin";

  if (!email || !password) {
    console.info("[AdminBootstrap] Skipping seed admin creation (env not set)");
    return;
  }

  try {
    const existingUser = await db.getUserByEmail(email);

    if (existingUser) {
      // 기존 유저가 있을 때, 환경변수 기준으로 정합성 보정
      const updates: Partial<User> = {};

      // 1) 역할 보정: admin으로 승격
      if (existingUser.role !== "admin") {
        updates.role = "admin";
      }

      // 2) 이메일 인증 보정: 관리자 계정은 항상 인증 완료 처리
      if (!existingUser.emailVerified) {
        updates.emailVerified = true;
      }

      // 3) 비밀번호 보정: ENV 비밀번호와 다르면 재설정
      const samePassword = await comparePassword(
        password,
        existingUser.passwordHash,
      );
      if (!samePassword) {
        updates.passwordHash = await hashPassword(password);
      }

      if (Object.keys(updates).length > 0) {
        await db.updateUser(existingUser.id, updates);
        console.info(
          `[AdminBootstrap] Synchronized existing admin ${email} with environment (role/emailVerified/password)`,
        );
      } else {
        console.info(
          "[AdminBootstrap] Seed admin already consistent with environment",
        );
      }
      return;
    }

    const passwordHash = await hashPassword(password);

    await db.createUser({
      email,
      passwordHash,
      fullName,
      instagramId: undefined,
      emailVerified: true,
      role: "admin",
    });

    console.info(`[AdminBootstrap] Seed admin user created for ${email}`);
  } catch (error) {
    console.error("[AdminBootstrap] Failed to ensure seed admin user:", error);
  }
};
