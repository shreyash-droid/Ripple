import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Our own signed JWT is the ONLY session token the API trusts. Both credential
// paths — email/password and Google — converge here: verify the credential once
// at login, then issue this token. Every request after that is identical.
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = "24h"; // single-token phase; refresh-token rotation is a later add

// Thrown when a request isn't authenticated. Carries a 401 so handlers can map
// it to the right status instead of the generic 500 their catch blocks return.
export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
    this.statusCode = 401;
  }
}

// --- password helpers (email/password path) ---

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10); // 10 rounds — standard, fast enough on Lambda
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// --- token helpers ---

// `sub` (subject) is the standard JWT claim for "who this is" — we put the user
// id there. email rides along so handlers rarely need a DB round-trip just to
// know who's asking.
export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET); // throws if invalid/expired
}

// --- the guard each protected handler calls ---

// Pulls the Bearer token off the request, verifies it, and hands back a small
// identity object. Throws AuthError on anything wrong — missing header, bad
// scheme, invalid or expired token — so the caller returns 401, not 500.
export function requireAuth(event) {
  // httpApi (API Gateway v2) lowercases header keys; check both to be safe.
  const raw =
    event.headers?.authorization || event.headers?.Authorization || "";

  const [scheme, token] = raw.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AuthError("Missing or malformed Authorization header");
  }

  try {
    const payload = verifyToken(token);
    return { userId: payload.sub, email: payload.email };
  } catch {
    throw new AuthError("Invalid or expired token");
  }
}