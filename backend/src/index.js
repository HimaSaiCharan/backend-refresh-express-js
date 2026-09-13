import "dotenv/config";
import express from "express";
import pool from "./db.js";

const app = express();
const port = 3000;

// Middleware to covert every body of request into JSON Object
app.use(express.json());

// CRUD Leave endpoint 
app.get("/leave-requests", async (request, response) => {
  const result = await pool.query(
    `SELECT id, user_id, start_date, end_date, reason, status, created_at
       FROM leave_requests
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [request.query.userId],
  );

  response.json(result.rows);
});

app.post("/leave-requests", async (request, response) => {
  const { userId, startDate, endDate, reason } = request.body;
  const result = await pool.query(
    `INSERT INTO leave_requests (user_id, start_date, end_date, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, startDate, endDate, reason], 
  );  

  response.status(201).json(result.rows[0]);
});  

app.put("/leave-requests/:id", async (request, response) => {
  const { startDate, endDate, reason } = request.body;
  const result = await pool.query(
    `UPDATE leave_requests
        SET start_date = $1, end_date = $2, reason = $3
      WHERE id = $4 AND status = 'pending'
      RETURNING *`,
    [startDate, endDate, reason, request.params.id],
  );

  if (result.rowCount === 0) {
    return response
      .status(404)
      .json({ message: "Pending leave request not found" });
  }

  response.json(result.rows[0]);
});

app.delete("/leave-requests/:id", async (request, response) => {
  const result = await pool.query(
    "DELETE FROM leave_requests WHERE id = $1 AND status = 'pending'",
    [request.params.id],
  );

  if (result.rowCount === 0) {
    return response
      .status(404)
      .json({ message: "Pending leave request not found" });
  }

  response.json({ message: "Leave request cancelled" });
});

app.get(
  "/manager/:managerId/leave-requests",
  async (request, response) => {
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
      [request.params.managerId],
    );

    response.json(result.rows);
  },
);

app.patch("/leave-requests/:id/status", async (request, response) => {
  const { status } = request.body;

  if (!["approved", "rejected"].includes(status)) {
    return response.status(400).json({
      message: "Status must be approved or rejected",
    });
  }

  const result = await pool.query(
    `UPDATE leave_requests
        SET status = $1
      WHERE id = $2 AND status = 'pending'
      RETURNING *`,
    [status, request.params.id],
  );

  if (result.rowCount === 0) {
    return response
      .status(404)
      .json({ message: "Pending leave request not found" });
  }

  response.json(result.rows[0]);
});

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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
