// Site24x7 APM Insight Initialization
import AgentAPI from "apminsight";
AgentAPI.config();

import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "#lib/auth";
// import middleware from "#middleware";
import userRouter from "#routes/users";
import subjectsRouter from "#routes/subjects";
import classesRouter from "#routes/classes";
import enrollmentsRouter from "#routes/enrollments";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // React app URL
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // allow cookies
  })
);

app.all("/api/auth/{*any}", toNodeHandler(auth));

// middleware
// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());
// app.use(middleware);

app.use("/users", userRouter);
app.use("/subjects", subjectsRouter);
app.use("/classes", classesRouter);
app.use("/enrollments", enrollmentsRouter);

app.get("/", async (req, res) => {
  res.send("Backend server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
