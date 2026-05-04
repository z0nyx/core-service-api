import { PasswordHashingService } from "./password-hashing.service";

describe("PasswordHashingService", () => {
  const service = new PasswordHashingService();

  it("hashes and verifies password", async () => {
    const plainPassword = "very_secure_password_123";
    const hash = await service.hash(plainPassword);

    const isValid = await service.verify(hash, plainPassword);

    expect(hash).not.toBe(plainPassword);
    expect(isValid).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await service.hash("correct_password");

    const isValid = await service.verify(hash, "wrong_password");

    expect(isValid).toBe(false);
  });
});
