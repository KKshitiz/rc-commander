import {
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  RoomContext,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Room, Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import "./App.css";

const serverUrl = "wss://rc-jrdbc5kb.livekit.cloud";

export default function App() {
  const [room] = useState(
    () =>
      new Room({
        // Optimize video quality for each participant's screen
        adaptiveStream: true,
        // Enable automatic audio/video quality optimization
        dynacast: true,
      })
  );
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);

  // Backend WebSocket state
  const [backendWs, setBackendWs] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [rcServerConnected, setRcServerConnected] = useState(false);
  const [arduinoConnected, setArduinoConnected] = useState(false);
  const [currentDirection, setCurrentDirection] = useState(null);
  const [serialLogs, setSerialLogs] = useState([]);

  const logsEndRef = useRef(null);

  // Connect to LiveKit room
  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      if (!mounted) return;

      setIsConnecting(true);
      setError(null);

      try {
        const baseUrl = import.meta.env.VITE_RC_SERVER_BASE_URL;
        // Fetch token from API endpoint
        const response = await fetch(`${baseUrl}/join?name=car`);

        if (!response.ok) {
          throw new Error(
            `Failed to get token: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const token = data.accessToken;

        if (!token) {
          throw new Error("Token not received from server");
        }

        // Connect to LiveKit room with fetched token
        if (mounted) {
          await room.connect(serverUrl, token);
          console.log("Connected to room:", room.name);
        }
      } catch (err) {
        console.error("Connection error:", err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setIsConnecting(false);
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      room.disconnect();
    };
  }, [room]);

  // Connect to backend WebSocket
  useEffect(() => {
    const connectToBackend = () => {
      const backendUrl = import.meta.env.VITE_BACKEND_WS_URL;
      const ws = new WebSocket(backendUrl);

      ws.onopen = () => {
        console.log("Connected to backend");
        setBackendConnected(true);
        setBackendWs(ws);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case "status":
              if (message.data.rcServerConnected !== undefined) {
                setRcServerConnected(message.data.rcServerConnected);
              }
              if (message.data.arduinoConnected !== undefined) {
                setArduinoConnected(message.data.arduinoConnected);
              }
              if (message.data.lastDirection !== undefined) {
                setCurrentDirection(message.data.lastDirection);
              }
              break;

            case "direction":
              setCurrentDirection(message.data);
              break;

            case "serial_log":
              setSerialLogs((prev) => [...prev.slice(-99), message.data]); // Keep last 100
              break;

            case "serial_logs":
              setSerialLogs(message.data);
              break;

            default:
              console.log("Unknown message type:", message.type);
          }
        } catch (error) {
          console.error("Error processing backend message:", error);
        }
      };

      ws.onclose = () => {
        console.log("Disconnected from backend, reconnecting...");
        setBackendConnected(false);
        setBackendWs(null);
        setTimeout(connectToBackend, 3000);
      };

      ws.onerror = (error) => {
        console.error("Backend WebSocket error:", error);
      };
    };

    connectToBackend();

    return () => {
      if (backendWs) {
        backendWs.close();
      }
    };
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serialLogs]);

  // Format direction for display
  const formatDirection = (direction) => {
    if (!direction) return "None";

    if (direction.action === "stop") {
      return `Stop (${direction.direction || "all"})`;
    }

    return `${direction.action}: ${direction.direction}`;
  };

  // Status indicator component
  const StatusIndicator = ({ connected, label }) => (
    <div className="status-indicator">
      <div
        className={`status-dot ${connected ? "connected" : "disconnected"}`}
      ></div>
      <span className="status-label">{label}</span>
    </div>
  );

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div className="connecting-container">
        <div className="connecting-spinner"></div>
        <p>Connecting to room...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️ Connection Error</div>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header with status indicators */}
      <header className="app-header">
        <h1>RC Car Control Panel</h1>
        <div className="status-indicators">
          <StatusIndicator connected={backendConnected} label="Backend" />
          <StatusIndicator connected={rcServerConnected} label="RC Server" />
          <StatusIndicator connected={arduinoConnected} label="Arduino" />
        </div>
      </header>

      {/* Main content area */}
      <div className="main-content">
        {/* Video feed section */}
        <div className="video-section">
          <RoomContext.Provider value={room}>
            <div data-lk-theme="default" className="video-container">
              <MyVideoConference />
              <RoomAudioRenderer />
              <ControlBar />
            </div>
          </RoomContext.Provider>
        </div>

        {/* Control info section */}
        <div className="control-section">
          <div className="direction-display">
            <h3>Current Direction</h3>
            <div className="direction-value">
              {formatDirection(currentDirection)}
            </div>
            {currentDirection && (
              <div className="direction-timestamp">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Serial logs section */}
          <div className="serial-logs">
            <h3>Arduino Serial Logs</h3>
            <div className="logs-container">
              {serialLogs.length === 0 ? (
                <div className="no-logs">No logs yet...</div>
              ) : (
                serialLogs.map((log, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-timestamp">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyVideoConference() {
  // `useTracks` returns all camera and screen share tracks. If a user
  // joins without a published camera track, a placeholder track is returned.
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  return (
    <GridLayout
      tracks={tracks}
      style={{ height: "calc(100% - var(--lk-control-bar-height))" }}
    >
      {/* The GridLayout accepts zero or one child. The child is used
      as a template to render all passed in tracks. */}
      <ParticipantTile />
    </GridLayout>
  );
}
