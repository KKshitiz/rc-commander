const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the public directory
app.use(express.static("public"));

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("Received:", data);

      // Process different actions
      if (data.action === "move") {
        console.log(`Movement: ${data.direction}`);
        // Here you would add code to control the RC car
        // based on the direction received

        switch (data.direction) {
          case "up":
            // Code to move forward
            console.log("Moving forward");
            break;
          case "down":
            // Code to move backward
            console.log("Moving backward");
            break;
          case "left":
            // Code to turn left
            console.log("Turning left");
            break;
          case "right":
            // Code to turn right
            console.log("Turning right");
            break;
        }
      } else if (data.action === "stop") {
        // Code to stop the RC car
        console.log("Stopping movement");
      }
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
