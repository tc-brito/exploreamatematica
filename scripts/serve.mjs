import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
};
http
  .createServer(async (req, res) => {
    try {
      let target = path.resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
      if (!target.startsWith(root)) {
        res.writeHead(403);
        return res.end();
      }
      if ((await stat(target)).isDirectory())
        target = path.join(target, "index.html");
      const body = await readFile(target);
      res.writeHead(200, {
        "Content-Type":
          mime[path.extname(target)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Arquivo não encontrado.");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Prévia: http://127.0.0.1:${port}`),
  );
