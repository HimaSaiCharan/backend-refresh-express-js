import "dotenv/config";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import express from "express";
import pool from "./db.js";

const app = express();
const port = 3000;

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Auth Middleware
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

const isInvalidLeaveRequest = ({ startDate, endDate, reason }) => {
  if (!startDate || !endDate || typeof reason !== "string" || !reason.trim()) {
    return true;
  }

  const startTime = Date.parse(startDate);
  const endTime = Date.parse(endDate);

  return Number.isNaN(startTime) || Number.isNaN(endTime) || startTime > endTime;
};

// User login endpoints
app.post("/login", async (request, response) => {
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

app.post("/logout", async (request, response) => {
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

// CRUD Employee Leave endpoints
app.get("/leave-requests", requireAuth, async (request, response) => {
  const result = await pool.query(
    `SELECT id, user_id, start_date, end_date, reason, status, created_at
       FROM leave_requests
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [request.user.id],
  );

  response.json(result.rows);
});

app.post("/leave-requests", requireAuth, async (request, response) => {
  const { startDate, endDate, reason } = request.body;

  if (isInvalidLeaveRequest({ startDate, endDate, reason })) {
    return response.status(400).json({ message: "Invalid leave request" });
  }

  const result = await pool.query(
    `INSERT INTO leave_requests (user_id, start_date, end_date, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [request.user.id, startDate, endDate, reason],
  );

  response.status(201).json(result.rows[0]);
});

app.put("/leave-requests/:id", requireAuth, async (request, response) => {
  const { startDate, endDate, reason } = request.body;

  if (isInvalidLeaveRequest({ startDate, endDate, reason })) {
    return response.status(400).json({ message: "Invalid leave request" });
  }

  const result = await pool.query(
    `UPDATE leave_requests
        SET start_date = $1, end_date = $2, reason = $3
      WHERE id = $4 AND user_id = $5 AND status = 'pending'
      RETURNING *`,
    [startDate, endDate, reason, request.params.id, request.user.id],
  );

  if (result.rowCount === 0) {
    return response
      .status(404)
      .json({ message: "Pending leave request not found" });
  }

  response.json(result.rows[0]);
});

app.delete("/leave-requests/:id", requireAuth, async (request, response) => {
  const result = await pool.query(
    `DELETE FROM leave_requests
      WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
    [request.params.id, request.user.id],
  );

  if (result.rowCount === 0) {
    return response
      .status(404)
      .json({ message: "Pending leave request not found" });
  }

  response.json({ message: "Leave request cancelled" });
});

// CRUD Manager Leave endpoints
app.get(
  "/manager/leave-requests",
  requireAuth,
  async (request, response) => {
    if (request.user.role !== "manager") {
      return response.status(403).json({ message: "Manager access required" });
    }

    const result = await pool.query(
      `SELECT leave_requests.id,
              leave_requests.user_id,
              leave_requests.start_date,
              leave_requests.end_date,
              leave_requests.reason,
              leave_requests.status,
              leave_requests.created_at,
              users.id AS employee_id,
              users.name AS employee_name,
              users.email AS employee_email
         FROM leave_requests
         JOIN users ON users.id = leave_requests.user_id
        WHERE users.manager_id = $1
        ORDER BY leave_requests.created_at DESC`,
      [request.user.id],
    );

    response.json(result.rows);
  },
);

app.patch(
  "/leave-requests/:id/status",
  requireAuth,
  async (request, response) => {
    if (request.user.role !== "manager") {
      return response.status(403).json({ message: "Manager access required" });
    }

    const { status } = request.body;

    if (!["approved", "rejected"].includes(status)) {
      return response.status(400).json({
        message: "Status must be approved or rejected",
      });
    }

    const leaveRequestResult = await pool.query(
      `SELECT users.manager_id
         FROM leave_requests
         JOIN users ON users.id = leave_requests.user_id
        WHERE leave_requests.id = $1`,
      [request.params.id],
    );
    const leaveRequest = leaveRequestResult.rows[0];

    if (!leaveRequest) {
      return response.status(404).json({ message: "Leave request not found" });
    }

    if (String(leaveRequest.manager_id) !== String(request.user.id)) {
      return response.status(403).json({
        message: "You do not manage this employee",
      });
    }

    const result = await pool.query(
      `UPDATE leave_requests AS leave_request
          SET status = $1
         FROM users
        WHERE leave_request.id = $2
          AND leave_request.status = 'pending'
          AND users.id = leave_request.user_id
          AND users.manager_id = $3
      RETURNING leave_request.*`,
      [status, request.params.id, request.user.id],
    );

    if (result.rowCount === 0) {
      return response
        .status(404)
        .json({ message: "Pending leave request not found" });
    }

    response.json(result.rows[0]);
  },
);

// Example for an endpoint with DB integration
app.get("/users", async (_request, response) => {
  const result = await pool.query(
    "SELECT id, name, email, role, manager_id FROM users ORDER BY id",
  );

  response.json(result.rows);
});

// Examples for Query Params & Route Params
app.get("/users/:id", (request, response) => {
  response.json({ id: request.params.id });
});

app.get("/search", (request, response) => {
  response.json({ status: request.query.status });
});

// App health apis
app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/echo", (request, response) => {
  response.json(request.body);
});

app.get("/db-health", async (_request, response) => {
  try {
    const result = await pool.query("SELECT NOW()");

    response.json({
      status: "ok",
      databaseTime: result.rows[0].now,
    });
  } catch (_error) {
    console.log({ _error });
    response.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.use((_request, response) => {
  response.status(404).json({ message: "Route not found" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
