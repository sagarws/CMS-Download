require("dotenv").config();
const express = require("express");
const path = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOAD_URL = process.env.DOWNLOAD_URL;

if (!DOWNLOAD_URL) {
  console.error("DOWNLOAD_URL is not set in .env");
  process.exit(1);
}

// GET /download -> streams the remote file straight to the client as an attachment
app.get("/download", async (req, res) => {
  try {
    const upstream = await fetch(DOWNLOAD_URL);
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ error: `Upstream responded with ${upstream.status}` });
    }

    const fileName = path.basename(new URL(DOWNLOAD_URL).pathname) || "download";
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    const length = upstream.headers.get("content-length");
    if (length) res.setHeader("Content-Length", length);

    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (err) {
    console.error("Download failed:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Download failed" });
    else res.destroy(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/download`);
});
