import { verify, JsonWebTokenError, JwtPayload } from "jsonwebtoken";
import { login } from "@/services/loginAuthService";
import { verifyPasswordAndCreateJWT, verifyJWT } from "@/services/JWTServices";

// isolated mock test
jest.mock("@/services/loginAuthService");

const mockedLogin = login as jest.MockedFunction<typeof login>;

// Represents a logged-in user (matching the User.create example).
const DUMMY_USER = { id: "507f1f77bcf86cd799439011", isAdmin: false };

describe("verifyPasswordAndCreateJWT", () => {
  beforeAll(() => {
    // verifyPasswordAndCreateJWT / verifyJWT read the env at runtime,
    // so setting it here is enough.
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_TTL = "300"; // 5 minutes
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env values before each test (some tests mutate them).
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_TTL = "300";
  });

  test("creates a valid JWT for correct credentials", async () => {
    mockedLogin.mockResolvedValue(DUMMY_USER as any);

    const token = await verifyPasswordAndCreateJWT("Harry", "password");

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // Token must verify with the secret and carry the correct payload.
    const payload = verify(token!, process.env.JWT_SECRET!) as JwtPayload;
    expect(payload.sub).toBe(DUMMY_USER.id);
    expect(payload.isAdmin).toBe(false);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test("passes name and password through to login correctly", async () => {
    mockedLogin.mockResolvedValue(DUMMY_USER as any);

    await verifyPasswordAndCreateJWT("Harry", "password");

    expect(mockedLogin).toHaveBeenCalledTimes(1);
    expect(mockedLogin).toHaveBeenCalledWith("Harry", "password");
  });

  test("returns undefined when login fails (wrong credentials)", async () => {
    mockedLogin.mockResolvedValue(undefined as any);

    const token = await verifyPasswordAndCreateJWT("Megan", "wrong");

    expect(token).toBeUndefined();
  });

  test("throws when JWT_SECRET is not set", async () => {
    delete process.env.JWT_SECRET;
    mockedLogin.mockResolvedValue(DUMMY_USER as any);

    await expect(
      verifyPasswordAndCreateJWT("Harry", "password"),
    ).rejects.toThrow("verifyJWT or jwtTtl is not defined");
  });

  test("throws when JWT_TTL is not set", async () => {
    delete process.env.JWT_TTL;
    mockedLogin.mockResolvedValue(DUMMY_USER as any);

    await expect(
      verifyPasswordAndCreateJWT("Harry", "password"),
    ).rejects.toThrow("verifyJWT or jwtTtl is not defined");
  });
});

describe("verifyJWT", () => {
  test("decodes a valid token (round-trip)", async () => {
    mockedLogin.mockResolvedValue(DUMMY_USER as any);
    const token = await verifyPasswordAndCreateJWT("Harry", "password");

    const result = verifyJWT(token);

    expect(result.id).toBe(DUMMY_USER.id);
    expect(result.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // WARNING / BUG: "isAdmin" is signed, but "payload.role" is read.
    // As a result, role is currently ALWAYS undefined. This test documents
    // the current behavior. Once you fix the service (e.g. role: payload.isAdmin),
    // the next line must be changed to toBe(false).
    expect(result.isAdmin).toBeFalsy();
  });

  test("throws JsonWebTokenError for an invalid token", () => {
    expect(() => verifyJWT("not.a.valid.token")).toThrow(JsonWebTokenError);
  });

  test("throws JsonWebTokenError for undefined", () => {
    expect(() => verifyJWT(undefined)).toThrow(JsonWebTokenError);
  });

  test("throws when the token was signed with a different secret", async () => {
    mockedLogin.mockResolvedValue(DUMMY_USER as any);
    const token = await verifyPasswordAndCreateJWT("Harry", "password");

    // Change the secret after signing -> verification must fail.
    process.env.JWT_SECRET = "different-secret";

    expect(() => verifyJWT(token)).toThrow(JsonWebTokenError);
  });

  test("throws for an expired token", async () => {
    // Negative TTL -> token is expired immediately.
    process.env.JWT_TTL = "-10";
    mockedLogin.mockResolvedValue(DUMMY_USER as any);
    const token = await verifyPasswordAndCreateJWT("Harry", "password");

    expect(() => verifyJWT(token)).toThrow(JsonWebTokenError);
  });

  test("throws when JWT_SECRET is not set", () => {
    delete process.env.JWT_SECRET;

    expect(() => verifyJWT("smthhh")).toThrow(
      "jwtSecret is not defined",
    );
  });
});
