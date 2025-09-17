import { readFile } from "fs/promises";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";
import { writeFile } from "fs/promises";

const serveFile = async (res, filePath, contentType) => {
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 page not found");
  }
};

const DATA_FILE = path.join("data", "links.json");

const loadLink = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}), "utf-8");
      return {};
    }
    throw error;
  }
};

const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links), "utf-8");
};

const server = createServer(async (req, res) => {
  if (req.method === "GET") {
    if (req.url === "/") {
      return serveFile(res, path.join("public", "index.html"), "text/html");
    } else if (req.url === "/style.css") {
      return serveFile(res, path.join("public", "style.css"), "text/css");
    } else if (req.url === "/link") {
      const link = await loadLink();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(link));
    } else {
      const link = await loadLink();
      const shortCode = req.url.slice(1);
      if (link[shortCode]) {
        res.writeHead(302, { location: link[shortCode] });
        return res.end()
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("404 page not found");
      console.log(shortCode);

    }
  }

  if (req.method === "POST" && req.url === "/shortend") {
    const link = await loadLink();
    let body = "";
    req.on("data", (chunk) => (body += chunk));

    req.on("end", async () => {
      let { url, shortCode } = JSON.parse(body);

      if (!url) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("URL is required...");
      }

      const finalShortCode = shortCode
        ? shortCode
        : crypto.randomBytes(4).toString("hex");

      if (link[finalShortCode]) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("Short code already exist...");
      }

      link[finalShortCode] = url;
      await saveLinks(link);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          shortCode: finalShortCode,
          shortUrl: `http://localhost:${PORT}/${finalShortCode}`,
        })
      );
    });
  }
});

const PORT = 3002; 

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
