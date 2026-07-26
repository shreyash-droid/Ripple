import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

// A connection pool reuses connections instead of opening a new one every time.
// We create it once and reuse it across warm Lambda invocations.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

// A tiny helper so the rest of the app just calls query(sql, params)
export async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}