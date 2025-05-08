const WebSocket = require("ws");

// Simple WebSocket client
const WS_URL = "wss://rc-commander.onrender.com";
const socket = new WebSocket(WS_URL);

socket.onopen = () => {
  console.log("Connected!");
  //   socket.send("Hello Server!");
};

socket.onmessage = (event) => {
  console.log("From server:", event.data);
};

socket.onclose = () => {
  console.log("Disconnected");
};
