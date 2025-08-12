import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupDatabase } from "./migrate";
import { startCronJobs } from "./cron";
import "dotenv/config";

// Вывод переменных окружения для отладки
console.log("PUBLIC_URL:", process.env.PUBLIC_URL);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Setup database before starting the server
  try {
    await setupDatabase();
  } catch (error) {
    console.error("Failed to set up database:", error);
    process.exit(1);
  }

  const server = await registerRoutes(app);

  // Запускаем cron задачи после инициализации сервера
  startCronJobs();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const defaultPort = Number(process.env.PORT) || 5001;
  const host = process.env.SERVER_HOST || "127.0.0.1";
  const startServer = (portToUse: number) =>
    server.listen(
      {
        port: portToUse,
        host,
      },
      () => {
        log(`serving on ${host}:${portToUse}`);
      }
    );

  try {
    startServer(defaultPort);
  } catch (err: any) {
    if (err && (err.code === "EADDRINUSE" || err.code === "EACCES")) {
      const fallback = defaultPort === 5000 ? 5001 : defaultPort + 1;
      log(`port ${defaultPort} busy, retry on ${fallback}`);
      startServer(fallback);
    } else {
      throw err;
    }
  }
})();
