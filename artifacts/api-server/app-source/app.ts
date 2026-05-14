// @ts-nocheck
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as pinoHttpModule from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Diagnostic logging for Vercel
if (process.env.NODE_ENV === "production") {
  console.log("Starting production server...");
  if (!process.env.DATABASE_URL && !process.env.SUPABASE_DATABASE_URL) {
    console.error("CRITICAL: DATABASE_URL is missing!");
  }
  if (!process.env.SESSION_SECRET) {
    console.error("CRITICAL: SESSION_SECRET is missing!");
  }
}

const pinoHttp = (pinoHttpModule as any).default || pinoHttpModule;

const app: Express = express();

app.use(
  // @ts-ignore
  (pinoHttp as any)({
    logger,
    serializers: {
      req(req: Request) {
        return {
          id: (req as any).id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: Response) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ 
  origin: ["https://financial-family.netlify.app", "https://financialfamily.onrender.com", "http://localhost:5173"], 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser((process.env.SESSION_SECRET as string) || "fallback-secret"));

app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok" });
});

// TEMPORARY DEBUG ROUTE - REMOVE AFTER FIXING
app.get("/api/debug-db", async (req, res) => {
  try {
    const users = await db.select({ username: usersTable.username }).from(usersTable);
    res.json({
      database_connected: true,
      db_url_prefix: process.env.DATABASE_URL?.substring(0, 10) + "...",
      users_found: users.map(u => u.username)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SELF-REPAIR ROUTE: visit this once to fix the admin password
app.get("/api/repair-admin", async (req, res) => {
  try {
    const argon2 = await import("argon2");
    const passwordHash = await argon2.hash("admin123");
    await db.update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.username, "admin"));
    
    res.json({ success: true, message: "Admin password repaired to 'admin123'" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static files from the public directory
app.use(express.static("public"));

app.use("/api", router);

// SPA fallback: Serve index.html for any other route
app.get("*path", (req: Request, res: Response) => {
  // If it's an API route that wasn't handled, let it 404
  if (req.url.startsWith("/api/")) {
    return res.status(404).json({ error: "Not Found" });
  }
  res.sendFile("index.html", { root: "public" });
});

export default app;
