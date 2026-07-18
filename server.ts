import express from "express";
import path from "path";

const app = express();
const PORT = 3000;

// Serve custom health API or any other API routes here
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Setup development or production environment
if (process.env.NODE_ENV !== "production") {
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
  const distPath = path.join(process.cwd(), "dist");
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
