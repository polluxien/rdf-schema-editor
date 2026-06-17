import { verify, JsonWebTokenError, JwtPayload } from "jsonwebtoken";
import { login } from "@/services/loginAuthService";
import { verifyPasswordAndCreateJWT } from "@/services/JWTServices";

//isolated mock test
jest.mock("@/services/loginAuthService");

const mockedLogin = login as jest.MockedFunction<typeof login>;

// So sieht ein eingeloggter User aus (wie in deinem User.create-Beispiel).
const DUMMY_USER = { id: "507f1f77bcf86cd799439011", isAdmin: false };

describe("verifyPasswordAndCreateJWT", () => {
  beforeAll(() => {
    // verifyPasswordAndCreateJWT / verifyJWT lesen die Env zur Laufzeit aus,
    // daher reicht es, sie hier zu setzen.
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_TTL = "300"; // 5 Minuten
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Env-Werte vor jedem Test sicher zurücksetzen (einzelne Tests verändern sie).
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_TTL = "300";
  });

  test("erzeugt einen gültigen JWT bei korrekten Credentials", async () => {
    mockedLogin.mockResolvedValue(DUMMY_USER as any);

    const token = await verifyPasswordAndCreateJWT("Harry", "password");

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // Token muss sich mit dem Secret verifizieren lassen und das richtige Payload tragen.
    const payload = verify(token!, process.env.JWT_SECRET!) as JwtPayload;
    expect(payload.sub).toBe(DUMMY_USER.id);
    expect(payload.isAdmin).toBe(false);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test("reicht name und password korrekt an login durch", async () => {
    mockedLogin.mockResolvedValue(DUMMY_USER as any);

    await verifyPasswordAndCreateJWT("Harry", "password");

    expect(mockedLogin).toHaveBeenCalledTimes(1);
    expect(mockedLogin).toHaveBeenCalledWith("Harry", "password");
  });

  test("gibt undefined zurück, wenn login fehlschlägt (falsche Credentials)", async () => {
    mockedLogin.mockResolvedValue(undefined as any);

    const token = await verifyPasswordAndCreateJWT("Megan", "falsch");

    expect(token).toBeUndefined();
  });

  test("wirft, wenn JWT_SECRET nicht gesetzt ist", async () => {
    delete process.env.JWT_SECRET;
    mockedLogin.mockResolvedValue(DUMMY_USER as any);

    await expect(
      verifyPasswordAndCreateJWT("Harry", "password"),
    ).rejects.toThrow("verifyJWT is not defined");
  });

  test("wirft, wenn JWT_TTL nicht gesetzt ist", async () => {
    delete process.env.JWT_TTL;
    mockedLogin.mockResolvedValue(DUMMY_USER as any);

    await expect(
      verifyPasswordAndCreateJWT("Harry", "password"),
    ).rejects.toThrow("verifyJWT is not defined");
  });
});

describe("verifyJWT", () => {
  test("dekodiert einen gültigen Token (Round-Trip)", async () => {
    mockedLogin.mockResolvedValue(DUMMY_USER as any);
    const token = await verifyPasswordAndCreateJWT("Harry", "password");

    const result = verifyJWT(token);

    expect(result.id).toBe(DUMMY_USER.id);
    expect(result.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // ACHTUNG / BUG: signiert wird "isAdmin", gelesen wird "payload.role".
    // role ist deshalb aktuell IMMER undefined. Dieser Test dokumentiert
    // das Ist-Verhalten. Sobald du den Service fixt (z. B. role: payload.isAdmin),
    // muss die nächste Zeile auf toBe(false) geändert werden.
    expect(result.role).toBeUndefined();
  });

  test("wirft JsonWebTokenError bei ungültigem Token", () => {
    expect(() => verifyJWT("kein.gueltiger.token")).toThrow(JsonWebTokenError);
  });

  test("wirft JsonWebTokenError bei undefined", () => {
    expect(() => verifyJWT(undefined)).toThrow(JsonWebTokenError);
  });

  test("wirft, wenn der Token mit falschem Secret signiert wurde", async () => {
    mockedLogin.mockResolvedValue(DUMMY_USER as any);
    const token = await verifyPasswordAndCreateJWT("Harry", "password");

    // Secret nach dem Signieren ändern -> Verifikation muss fehlschlagen.
    process.env.JWT_SECRET = "anderes-secret";

    expect(() => verifyJWT(token)).toThrow(JsonWebTokenError);
  });

  test("wirft bei abgelaufenem Token", async () => {
    // TTL negativ -> Token ist sofort abgelaufen.
    process.env.JWT_TTL = "-10";
    mockedLogin.mockResolvedValue(DUMMY_USER as any);
    const token = await verifyPasswordAndCreateJWT("Harry", "password");

    expect(() => verifyJWT(token)).toThrow(JsonWebTokenError);
  });

  test("wirft, wenn JWT_SECRET nicht gesetzt ist", () => {
    delete process.env.JWT_SECRET;

    expect(() => verifyJWT("smthhh")).toThrow("verifyJWT is not defined");
  });
});
