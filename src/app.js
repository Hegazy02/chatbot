import express from "express";
import path from "path";
import { JSON_BODY_LIMIT, PUBLIC_DIR } from "./config.js";
import cvRoutes from "./routes/cv.routes.js";
import chatRoutes from "./routes/chat.routes.js";

const app = express();

app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.static(PUBLIC_DIR));

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use("/api", cvRoutes);
app.use("/api", chatRoutes);

export default app;
