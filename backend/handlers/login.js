import { query } from "../lib/db.js";
import { verifyPassword, signToken } from "../lib/auth.js";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const email = String(body.email || "").trim().toLowerCase();
    const { password } = body;

    if (!email || !password) {
      return json(400, { error: "email and password are required" });
    }

    const rows = await query(
      `SELECT id, email, password_hash, name, avatar_url
       FROM users WHERE email = $1`,
      [email]
    );
    const user = rows[0];

    // One deliberately vague message for "no such user", "wrong password", AND
    // "this is a Google-only account with no password" — telling them which one
    // failed just helps an attacker enumerate accounts.
    const invalid = () => json(401, { error: "Invalid email or password" });

    if (!user) return invalid();
    if (!user.password_hash) return invalid(); // Google-only account, no password set
    if (!(await verifyPassword(password, user.password_hash))) return invalid();

    // Never ship the hash back to the client.
    const { password_hash, ...safeUser } = user;
    return json(200, { token: signToken(safeUser), user: safeUser });
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}