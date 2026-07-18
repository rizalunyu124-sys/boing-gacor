import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();
const PORT = 3000;

// Resolve __dirname under ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve custom health API or any other API routes here
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Determine environment
const isDevelopment = process.env.NODE_ENV !== "production" && !process.env.VERCEL;

// Setup development or production environment
if (isDevelopment) {
  // Dynamically import Vite to prevent bundling issues on production/Vercel
  import("vite").then(async ({ createServer: createViteServer }) => {
    console.log("Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }).catch((err) => {
    console.error("Failed to start Vite dev server:", err);
  });
} else {
  console.log("Starting in production mode, serving static files from dist...");
  
  // Robust path resolution for dist folder on Vercel
  let distPath = path.join(process.cwd(), "dist");
  if (!fs.existsSync(distPath)) {
    distPath = path.join(__dirname, "dist");
  }
  if (!fs.existsSync(distPath)) {
    distPath = path.join(__dirname, "..", "dist");
  }

  console.log(`Resolved static dist path: ${distPath}`);

  app.use(express.static(distPath));
  
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

export default app;
