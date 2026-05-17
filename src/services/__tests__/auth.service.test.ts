import { describe, it, expect, vi, beforeEach } from "vitest";
import * as AuthService from "../auth.service.js";
import * as UserRepo from "../../repositories/user.repo.js";
import * as SessionRepo from "../../repositories/session.repo.js";

// Mock dependencies
vi.mock("../../repositories/user.repo.js");
vi.mock("../../repositories/session.repo.js");

vi.mock("../token/hash.strategy.js", () => {
  return {
    HashStrategy: class {
      hash = vi.fn().mockResolvedValue("hashedPassword");
      compare = vi.fn((pass, hash) => Promise.resolve(pass === "correctPassword" && hash === "hashedPassword"));
    }
  };
});

vi.mock("../token/token.strategy.js", () => {
  return {
    TokenStrategy: class {
      generateAccessToken = vi.fn().mockReturnValue("mockAccessToken");
      generateRefreshToken = vi.fn().mockReturnValue("mockRefreshToken");
    }
  };
});

describe("AuthService - Login Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw 401 error if user does not exist", async () => {
    vi.mocked(UserRepo.findUserByEmail).mockResolvedValue(null);

    await expect(AuthService.login({ email: "notfound@example.com", password: "password123" }))
      .rejects.toThrow("Email hoặc mật khẩu không đúng!");
  });

  it("should throw 401 error if password does not match", async () => {
    vi.mocked(UserRepo.findUserByEmail).mockResolvedValue({
      userId: "user-1",
      name: "John Doe",
      email: "test@example.com",
      passwordHash: "hashedPassword",
      role: "student",
    });

    await expect(AuthService.login({ email: "test@example.com", password: "wrongPassword" }))
      .rejects.toThrow("Email hoặc mật khẩu không đúng!");
  });

  it("should return tokens and user data if credentials are correct", async () => {
    vi.mocked(UserRepo.findUserByEmail).mockResolvedValue({
      userId: "user-1",
      name: "John Doe",
      email: "test@example.com",
      passwordHash: "hashedPassword",
      role: "student",
    });

    vi.mocked(SessionRepo.saveRefreshToken).mockResolvedValue(undefined);

    const result = await AuthService.login({ email: "test@example.com", password: "correctPassword" });

    expect(result.accessToken).toBe("mockAccessToken");
    expect(result.refreshToken).toBe("mockRefreshToken");
    expect(result.user).toEqual({
      userId: "user-1",
      name: "John Doe",
      email: "test@example.com",
      role: "student",
    });

    // Ensure session was saved with correct parameters
    expect(SessionRepo.saveRefreshToken).toHaveBeenCalledWith(
      "user-1",
      "mockRefreshToken",
      7 * 24 * 60 * 60
    );
  });
});
