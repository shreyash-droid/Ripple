import { query } from "../lib/db.js";
import { hashPassword, signToken } from "../lib/auth.js";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const email = String(body.email || "").trim().toLowerCase();
    const { password, name } = body;

    // Basic validation. Lowercasing email keeps "Alice@" and "alice@" one account.
    if (!email || !password) {
      return json(400, { error: "email and password are required" });
    }
    if (password.length < 8) {
      return json(400, { error: "password must be at least 8 characters" });
    }

    const password_hash = await hashPassword(password);

    // The email UNIQUE constraint is the real guard against duplicates — we let
    // the DB enforce it rather than a check-then-insert race. 23505 = unique
    // violation, which we translate into a clean 409 instead of a 500.
    let rows;
    try {
      rows = await query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, avatar_url`,
        [email, password_hash, name || null]
      );
    } catch (err) {
      if (err.code === "23505") {
        return json(409, { error: "That email is already registered" });
      }
      throw err;
    }

    const user = rows[0];
    return json(201, { token: signToken(user), user });
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