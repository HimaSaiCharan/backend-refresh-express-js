import pool from "../db.js";

const requireAuth = async (request, response, next) => {
  const sessionId = request.cookies.session_id;

  if (!sessionId) {
    return response.status(401).json({ message: "Authentication required" });
  }

  const result = await pool.query(
    `SELECT users.id, users.name, users.email, users.role, users.manager_id
       FROM sessions
       JOIN users ON users.id = sessions.user_id
      WHERE sessions.id::text = $1`,
    [sessionId],
  );

  if (result.rowCount === 0) {
    return response.status(401).json({ message: "Authentication required" });
  }

  request.user = result.rows[0];
  next();
};

export default requireAuth;
