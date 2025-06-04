# RC Car Control Panel Setup Guide

## Overview

This control panel provides:

- Live video feed from the RC car via LiveKit
- Real-time direction monitoring from WebSocket commands
- Arduino serial communication for hardware control
- Serial log monitoring with a live UI

## Prerequisites

1. **Node.js** (v18+ recommended) and **pnpm**
2. **Arduino Nano** connected via USB
3. **RC Server** running (from the `../server` directory)

## Installation

1. Install dependencies:

```bash
pnpm install
```

2. Create environment configuration:

```bash
# Copy and edit the environment file
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Frontend Configuration
VITE_RC_SERVER_BASE_URL=http://192.168.1.100:3000
VITE_BACKEND_WS_URL=ws://192.168.1.100:8081

# Backend Configuration
RC_SERVER_WS_URL=ws://192.168.1.100:3000
ARDUINO_PORT=/dev/ttyUSB0
ARDUINO_BAUD_RATE=9600
BACKEND_PORT=8081
```

## Arduino Setup

### Hardware Connection

- Connect Arduino Nano via USB to the Raspberry Pi
- The serial port will typically be `/dev/ttyUSB0` or `/dev/ttyACM0`

### Find Your Arduino Port

```bash
# List available serial ports
ls /dev/tty*

# Check for new devices after plugging in Arduino
dmesg | grep tty
```

### Arduino Code Requirements

Your Arduino should be programmed to:

1. Read JSON commands from serial port
2. Send status/debug messages back via serial
3. Expected JSON format: `{"action": "move", "direction": "up"}`

Example Arduino code structure:

```cpp
void setup() {
  Serial.begin(9600);
  // Initialize motors, servos, etc.
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    // Parse JSON and control motors
    Serial.println("Command received: " + command);
  }
}
```

## Running the Control Panel

### Option 1: Run Everything Together

```bash
pnpm run start:all
```

This starts both the backend service and frontend dev server.

### Option 2: Run Separately

```bash
# Terminal 1: Backend service
pnpm run backend

# Terminal 2: Frontend dev server
pnpm run dev
```

### Option 3: Production Build

```bash
# Build the frontend
pnpm run build

# Run only the backend (serve built files with nginx/similar)
pnpm run backend
```

## Architecture

```
┌─────────────────┐    WebSocket    ┌──────────────────┐
│   RC Server     │◄───────────────►│ Control Panel    │
│  (server.js)    │                 │   Backend        │
└─────────────────┘                 └──────────────────┘
                                            │
                                            │ Serial
                                            ▼
                                    ┌──────────────────┐
                                    │  Arduino Nano    │
                                    │  (RC Hardware)   │
                                    └──────────────────┘
                                            ▲
                                            │ WebSocket
                                            ▼
                                    ┌──────────────────┐
                                    │ Control Panel    │
                                    │   Frontend       │
                                    │ (React/Vite)     │
                                    └──────────────────┘
```

## Features

### 1. Live Direction Monitoring

- Shows current movement commands in real-time
- Displays last update timestamp
- Visual indicators for connection status

### 2. Arduino Serial Communication

- Forwards WebSocket commands to Arduino via serial
- Real-time serial log monitoring
- Automatic reconnection on serial port disconnection
- Configurable baud rate and port

### 3. Status Monitoring

- Backend connection status
- RC Server connection status
- Arduino connection status
- Color-coded indicators (green=connected, red=disconnected)

### 4. Live Video Feed

- Integrated LiveKit video streaming
- Camera controls and audio
- Grid layout for multiple participants

## Troubleshooting

### Serial Port Issues

```bash
# Check permissions
sudo usermod -a -G dialout $USER
# Logout and login again

# Test serial connection
sudo minicom -D /dev/ttyUSB0 -b 9600
```

### WebSocket Connection Issues

1. Verify RC Server is running on the correct port
2. Check firewall settings
3. Ensure CORS is properly configured in server.js

### Docker Deployment

```bash
# Build for Raspberry Pi
docker buildx build --platform linux/arm/v7 -t control-panel:armv7 --load .

# Run container with serial port access
docker run -d \
  --name control-panel \
  --device=/dev/ttyUSB0 \
  -p 8080:80 \
  -e ARDUINO_PORT=/dev/ttyUSB0 \
  control-panel:armv7
```

## Configuration Options

### Environment Variables

| Variable                  | Description             | Default                 |
| ------------------------- | ----------------------- | ----------------------- |
| `VITE_RC_SERVER_BASE_URL` | RC Server HTTP URL      | `http://localhost:3000` |
| `VITE_BACKEND_WS_URL`     | Backend WebSocket URL   | `ws://localhost:8081`   |
| `RC_SERVER_WS_URL`        | RC Server WebSocket URL | `ws://localhost:3000`   |
| `ARDUINO_PORT`            | Serial port path        | `/dev/ttyUSB0`          |
| `ARDUINO_BAUD_RATE`       | Serial baud rate        | `9600`                  |
| `BACKEND_PORT`            | Backend server port     | `8081`                  |

### Port Configuration

- Frontend dev server: `5173` (Vite default)
- Backend WebSocket: `8081` (configurable)
- RC Server: `3000` (from main server)
- LiveKit: External service (configured in RC Server)

## Development

### Project Structure

```
control-panel/
├── backend/
│   └── server.js           # Node.js backend for serial communication
├── src/
│   ├── App.jsx            # Main React component
│   ├── App.css            # Styling
│   └── main.jsx           # React entry point
├── Dockerfile             # Multi-stage build for production
├── package.json           # Dependencies and scripts
└── SETUP.md              # This file
```

### Adding Features

1. Backend changes: Edit `backend/server.js`
2. Frontend changes: Edit `src/App.jsx`
3. Styling: Edit `src/App.css`

### Serial Communication Protocol

Commands sent to Arduino:

```json
{"action": "move", "direction": "up"}
{"action": "stop", "direction": "up"}
```

Expected Arduino responses:

```
Any text logged to Serial.println() will appear in the UI
```
