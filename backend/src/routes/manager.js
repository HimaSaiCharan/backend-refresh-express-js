import express from "express";
import pool from "../db.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.get(
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

router.patch(
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

export default router;
