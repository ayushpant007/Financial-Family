// @ts-nocheck
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as pinoHttpModule from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser((process.env.SESSION_SECRET as string) || "fallback-secret"));

app.use("/api", router);

export default app;
