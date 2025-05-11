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
import { useEffect, useState } from "react";

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

  // Connect to room with token from API
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

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div
        className="connecting-container"
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          background: "#f0f4f9",
        }}
      >
        <div
          className="connecting-spinner"
          style={{
            border: "4px solid rgba(0, 0, 0, 0.1)",
            borderLeft: "4px solid #3291ff",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            animation: "spin 1s linear infinite",
            marginBottom: "20px",
          }}
        ></div>
        <p>Connecting to room...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div
        className="error-container"
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          background: "#fff0f0",
          padding: "20px",
        }}
      >
        <div
          style={{
            color: "#e53e3e",
            fontSize: "24px",
            marginBottom: "20px",
          }}
        >
          ⚠️ Connection Error
        </div>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            background: "#3291ff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <div data-lk-theme="default" style={{ height: "100vh" }}>
        {/* Your custom component with basic video conferencing functionality. */}
        <MyVideoConference />
        {/* The RoomAudioRenderer takes care of room-wide audio for you. */}
        <RoomAudioRenderer />
        {/* Controls for the user to start/stop audio, video, and screen share tracks */}
        <ControlBar />
      </div>
    </RoomContext.Provider>
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
      style={{ height: "calc(100vh - var(--lk-control-bar-height))" }}
    >
      {/* The GridLayout accepts zero or one child. The child is used
      as a template to render all passed in tracks. */}
      <ParticipantTile />
    </GridLayout>
  );
}
