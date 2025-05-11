const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const livekit = require("./livekit");
const cors = require("cors");

require("dotenv").config();

const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
  })
);
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the public directory
app.use("/", express.static("public"));

app.use("/join", livekit.generateToken);

wss.on("connection", (ws) => {
  const clientIp = ws._socket.remoteAddress;
  const clientPort = ws._socket.remotePort;
  const userAgent = ws.protocol || "Unknown";
  console.log(
    `New WebSocket connection from ${clientIp}:${clientPort} with User-Agent: ${userAgent}`
  );
  console.log(`Total active connections: ${wss.clients.size}`);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("Received:", data);
      // Send the received data to all clients except the sender
      wss.clients.forEach((client) => {
        // Check if client is open and not the sender
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
      // Process different actions
      //   if (data.action === "move") {
      //     console.log(`Movement: ${data.direction}`);
      //     // Here you would add code to control the RC car
      //     // based on the direction received

      //     switch (data.direction) {
      //       case "up":
      //         // Code to move forward
      //         console.log("Moving forward");
      //         break;
      //       case "down":
      //         // Code to move backward
      //         console.log("Moving backward");
      //         break;
      //       case "left":
      //         // Code to turn left
      //         console.log("Turning left");
      //         break;
      //       case "right":
      //         // Code to turn right
      //         console.log("Turning right");
      //         break;
      //     }
      //   } else if (data.action === "stop") {
      //     // Code to stop the RC car
      //     console.log("Stopping movement");
      //   }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
