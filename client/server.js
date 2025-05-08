const express = require("express");
const path = require("path");
const app = express();
const port = 3005;
const http = require("http");

const server = http.createServer(app);

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Send index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

server.listen(port, () => {
  console.log(`Webcam client server listening at http://localhost:${port}`);
});
