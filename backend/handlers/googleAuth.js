import { OAuth2Client } from "google-auth-library";
import { query } from "../lib/db.js";
import { signToken } from "../lib/auth.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { credential } = body; // the ID token the Google button hands the frontend

    if (!credential) {
      return json(400, { error: "credential is required" });
    }

    // 1. Verify the ID token against Google's public keys AND check it was minted
    //    for OUR client id. This is the whole security boundary — if this passes,
    //    Google vouches for the identity. No client secret involved in this flow.
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return json(401, { error: "Invalid Google credential" });
    }

    const { sub: google_sub, email, name, picture, email_verified } = payload;

    // 2. Only trust the email if Google says they verified ownership. This is what
    //    makes email-based account linking (below) safe from hijacking.
    if (!email_verified) {
      return json(401, { error: "Google email is not verified" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    // 3. Have we seen this Google identity before? Match on sub (stable), not email.
    let rows = await query(
      `SELECT id, email, name, avatar_url FROM users WHERE google_sub = $1`,
      [google_sub]
    );
    if (rows[0]) {
      return json(200, { token: signToken(rows[0]), user: rows[0] });
    }

    // 4. New Google identity. Does an account already exist under this email
    //    (i.e. they signed up with a password earlier)? If so — LINK: attach this
    //    google_sub to their existing row instead of creating a duplicate account.
    rows = await query(
      `UPDATE users
         SET google_sub = $1,
             name       = COALESCE(name, $2),
             avatar_url = COALESCE(avatar_url, $3),
             updated_at = now()
       WHERE email = $4 AND google_sub IS NULL
       RETURNING id, email, name, avatar_url`,
      [google_sub, name || null, picture || null, normalizedEmail]
    );
    if (rows[0]) {
      return json(200, { token: signToken(rows[0]), user: rows[0] });
    }

    // 5. Brand-new user, no existing account either way — create one.
    rows = await query(
      `INSERT INTO users (email, google_sub, name, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, avatar_url`,
      [normalizedEmail, google_sub, name || null, picture || null]
    );
    return json(200, { token: signToken(rows[0]), user: rows[0] });
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