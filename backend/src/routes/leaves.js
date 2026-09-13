import express from "express";
import pool from "../db.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

const isInvalidLeaveRequest = ({ startDate, endDate, reason }) => {
  if (!startDate || !endDate || typeof reason !== "string" || !reason.trim()) {
    return true;
  }

  const startTime = Date.parse(startDate);
  const endTime = Date.parse(endDate);
  return Number.isNaN(startTime) || Number.isNaN(endTime) || startTime > endTime;
};

router.get("/leave-requests", requireAuth, async (request, response) => {
  const result = await pool.query(
    `SELECT id, user_id, start_date, end_date, reason, status, created_at
       FROM leave_requests
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [request.user.id],
  );
  response.json(result.rows);
});

router.post("/leave-requests", requireAuth, async (request, response) => {
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

router.put("/leave-requests/:id", requireAuth, async (request, response) => {
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

router.delete("/leave-requests/:id", requireAuth, async (request, response) => {
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

export default router;
