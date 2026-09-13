import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../src/db.js";

const developmentPassword = "password";
const seededEmails = [
  "maya.patel@example.com",
  "daniel.kim@example.com",
  "sofia.martinez@example.com",
];

try {
  const passwordHash = await bcrypt.hash(developmentPassword, 10);
  const result = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE email = ANY($2::text[])",
    [passwordHash, seededEmails],
  );

  console.log(`Updated ${result.rowCount} seeded users`);
} finally {
  await pool.end();
}
