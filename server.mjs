import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const root = process.cwd();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".tsx": "text/babel; charset=utf-8",
};

function resolvePath(urlPath) {
  const cleanPath = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const relativePath = cleanPath === "/" ? "/index.html" : cleanPath;
  return join(root, relativePath);
}

const server = createServer(async (request, response) => {
  const requestPath = request.url || "/";
  const filePath = resolvePath(requestPath);
  console.log(`${request.method || "GET"} ${requestPath}`);

  try {
    const fileStat = await stat(filePath);
    const targetPath = fileStat.isDirectory() ? join(filePath, "index.html") : filePath;
    const extension = extname(targetPath);
    const mimeType = mimeTypes[extension] || "application/octet-stream";

    response.writeHead(200, { "Content-Type": mimeType, "Cache-Control": "no-store" });
    createReadStream(targetPath).pipe(response);
  } catch {
    const fallbackPath = join(root, "index.html");

    if (existsSync(fallbackPath)) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      createReadStream(fallbackPath).pipe(response);
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Mermaid Viewer running at http://${host}:${port}`);
});
