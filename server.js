import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WordStore } from "./src/data/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT ?? 4738);
const store = new WordStore({ rootDir: __dirname });

await store.load();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`得背单词 is running at http://127.0.0.1:${port}`);
});

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/dashboard") {
    sendJson(response, 200, await store.getDashboard());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/queue") {
    sendJson(response, 200, { queue: store.getQueue() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/books") {
    sendJson(response, 200, { books: store.getBooks() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/weak-words") {
    sendJson(response, 200, { words: store.getWeakWords() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/export") {
    sendJson(response, 200, store.data);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/review") {
    const body = await readJson(request);
    sendJson(response, 200, await store.submitReview(body.wordId, body.grade));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/settings") {
    const body = await readJson(request);
    sendJson(response, 200, { settings: await store.updateSettings(body) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/import") {
    const body = await readJson(request);
    sendJson(response, 200, await store.importWords(body.words ?? [], body.bookName));
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

async function serveStatic(response, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, { "Content-Type": getContentType(filePath) });
    response.end(file);
  } catch {
    sendText(response, 404, "Not found");
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) request.destroy();
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, status, text) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

