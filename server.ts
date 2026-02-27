import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route to proxy the logo and bypass CORS
  app.get("/api/logo-proxy", async (req, res) => {
    const logoUrl = 'https://minio.contadordepadaria.com/api/v1/buckets/typebot/objects/download?preview=true&prefix=logos%2FContador%20de%20Padarias%2FLogo%20-%20CP%20AZUL.png&version_id=null';
    
    try {
      const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
      const contentType = response.headers["content-type"] || "image/png";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(Buffer.from(response.data));
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Error fetching logo");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
