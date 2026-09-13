import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import pool from "./db.js";
import authRouter from "./routes/auth.js";
import leavesRouter from "./routes/leaves.js";
import managerRouter from "./routes/manager.js";

const app = express();
const port = 3000;

// Middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Routers
app.use(authRouter);
app.use(leavesRouter);
app.use(managerRouter);

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

// 404 Endpoint Not Found
app.use((_request, response) => {
  response.status(404).json({ message: "Route not found" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
