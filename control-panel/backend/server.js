import { ReadlineParser } from "@serialport/parser-readline";
import "dotenv/config";
import { createServer } from "http";
import { SerialPort } from "serialport";
import WebSocket, { WebSocketServer } from "ws";

// Configuration
const RC_SERVER_WS_URL = process.env.RC_SERVER_WS_URL;
const ARDUINO_PORT = process.env.ARDUINO_PORT;
const ARDUINO_BAUD_RATE = parseInt(process.env.ARDUINO_BAUD_RATE);
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT);

class ControlPanelBackend {
  constructor() {
    this.rcServerWs = null;
    this.serialPort = null;
    this.parser = null;
    this.frontendClients = new Set();
    this.lastDirection = null;
    this.serialLogs = [];
    this.maxLogs = 100; // Keep last 100 log entries

    this.setupWebSocketServer();
    this.connectToRCServer();
    this.connectToArduino();
  }

  // Setup WebSocket server for frontend connections
  setupWebSocketServer() {
    const server = createServer();
    this.wss = new WebSocketServer({ server });

    this.wss.on("connection", (ws) => {
      console.log("Frontend client connected");
      this.frontendClients.add(ws);

      // Send current state to new client
      ws.send(
        JSON.stringify({
          type: "status",
          data: {
            rcServerConnected: this.rcServerWs?.readyState === WebSocket.OPEN,
            arduinoConnected: this.serialPort?.isOpen || false,
            lastDirection: this.lastDirection,
          },
        })
      );

      // Send recent logs
      if (this.serialLogs.length > 0) {
        ws.send(
          JSON.stringify({
            type: "serial_logs",
            data: this.serialLogs.slice(-20), // Send last 20 logs
          })
        );
      }

      ws.on("close", () => {
        console.log("Frontend client disconnected");
        this.frontendClients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("Frontend WebSocket error:", error);
        this.frontendClients.delete(ws);
      });
    });

    server.listen(BACKEND_PORT, () => {
      console.log(`Backend WebSocket server listening on port ${BACKEND_PORT}`);
    });
  }

  // Connect to the main RC server WebSocket
  connectToRCServer() {
    console.log(`Connecting to RC server at ${RC_SERVER_WS_URL}`);

    this.rcServerWs = new WebSocket(RC_SERVER_WS_URL);

    this.rcServerWs.on("open", () => {
      console.log("Connected to RC server WebSocket");
      this.broadcastToFrontend({
        type: "status",
        data: { rcServerConnected: true },
      });
    });

    this.rcServerWs.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log("Received from RC server:", message);

        // Forward direction to Arduino
        if (message.command) {
          this.sendToArduino(message.command);
          this.lastDirection = message.command;

          // Broadcast to frontend
          this.broadcastToFrontend({
            type: "command",
            data: message.command,
          });
        }
      } catch (error) {
        console.error("Error processing RC server message:", error);
      }
    });

    this.rcServerWs.on("close", () => {
      console.log("Disconnected from RC server, attempting to reconnect...");
      this.broadcastToFrontend({
        type: "status",
        data: { rcServerConnected: false },
      });
      setTimeout(() => this.connectToRCServer(), 3000);
    });

    this.rcServerWs.on("error", (error) => {
      console.error("RC server WebSocket error:", error);
    });
  }

  // Connect to Arduino via serial port
  connectToArduino() {
    console.log(
      `Connecting to Arduino on ${ARDUINO_PORT} at ${ARDUINO_BAUD_RATE} baud`
    );

    try {
      this.serialPort = new SerialPort({
        path: ARDUINO_PORT,
        baudRate: ARDUINO_BAUD_RATE,
        autoOpen: false,
      });

      this.parser = this.serialPort.pipe(
        new ReadlineParser({ delimiter: "\n" })
      );

      this.serialPort.open((error) => {
        if (error) {
          console.error("Failed to open serial port:", error.message);
          this.addSerialLog(
            `ERROR: Failed to open ${ARDUINO_PORT}: ${error.message}`
          );
          // Retry after 5 seconds
          setTimeout(() => this.connectToArduino(), 5000);
          return;
        }

        console.log("Connected to Arduino");
        this.addSerialLog(`Connected to Arduino on ${ARDUINO_PORT}`);
        this.broadcastToFrontend({
          type: "status",
          data: { arduinoConnected: true },
        });
      });

      this.parser.on("data", (data) => {
        const logEntry = data.trim();
        if (logEntry) {
          console.log("Arduino:", logEntry);
          this.addSerialLog(logEntry);
        }
      });

      this.serialPort.on("error", (error) => {
        console.error("Serial port error:", error);
        this.addSerialLog(`ERROR: ${error.message}`);
      });

      this.serialPort.on("close", () => {
        console.log("Serial port closed, attempting to reconnect...");
        this.addSerialLog("Serial port closed, reconnecting...");
        this.broadcastToFrontend({
          type: "status",
          data: { arduinoConnected: false },
        });
        setTimeout(() => this.connectToArduino(), 3000);
      });
    } catch (error) {
      console.error("Error setting up serial port:", error);
      this.addSerialLog(`ERROR: ${error.message}`);
      setTimeout(() => this.connectToArduino(), 5000);
    }
  }

  // Send command to Arduino
  sendToArduino(command) {
    if (!this.serialPort || !this.serialPort.isOpen) {
      console.log("Arduino not connected, command not sent:", command);
      return;
    }

    try {
      // Map WebSocket command to Arduino command format
      const mappedCommand = `${command}\n`;

      console.log("commandString", mappedCommand);
      this.serialPort.write(mappedCommand, (error) => {
        if (error) {
          console.error("Error writing to Arduino:", error);
          this.addSerialLog(`ERROR: Write failed - ${error.message}`);
        } else {
          console.log("Sent to Arduino:", mappedCommand);
          this.addSerialLog(`SENT: ${JSON.stringify(mappedCommand)}`);
        }
      });
    } catch (error) {
      console.error("Error sending to Arduino:", error);
      this.addSerialLog(`ERROR: ${error.message}`);
    }
  }

  // Map WebSocket commands to Arduino command format
  mapCommand(incomingCommand) {
    return incomingCommand;
  }

  // Add log entry and broadcast to frontend
  addSerialLog(message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message: message,
    };

    this.serialLogs.push(logEntry);

    // Keep only last maxLogs entries
    if (this.serialLogs.length > this.maxLogs) {
      this.serialLogs = this.serialLogs.slice(-this.maxLogs);
    }

    // Broadcast to frontend
    this.broadcastToFrontend({
      type: "serial_log",
      data: logEntry,
    });
  }

  // Broadcast message to all connected frontend clients
  broadcastToFrontend(message) {
    const messageString = JSON.stringify(message);
    this.frontendClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }
}

// Start the backend service
console.log("Starting Control Panel Backend...");
new ControlPanelBackend();
