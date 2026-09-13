import bcrypt from "bcryptjs";
import express from "express";
import { randomUUID } from "node:crypto";
import pool from "../db.js";

const router = express.Router();

router.post("/login", async (request, response) => {
  const { email, password } = request.body;
  const result = await pool.query(
    "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
    [email],
  );
  const user = result.rows[0];

  if (!user || !user.password_hash) {
    return response.status(401).json({ message: "Invalid email or password" });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return response.status(401).json({ message: "Invalid email or password" });
  }

  const sessionId = randomUUID();
  await pool.query("INSERT INTO sessions (id, user_id) VALUES ($1, $2)", [
    sessionId,
    user.id,
  ]);

  response.cookie("session_id", sessionId, {
    httpOnly: true,
    sameSite: "lax",
  });
  response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

router.post("/logout", async (request, response) => {
  const sessionId = request.cookies.session_id;

  if (sessionId) {
    await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
  }

  response.clearCookie("session_id", {
    httpOnly: true,
    sameSite: "lax",
  });
  response.json({ message: "Logged out" });
});

export default router;
