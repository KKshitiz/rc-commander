// const { Room } = require("livekit-client");

const wsURL = "wss://rc-jrdbc5kb.livekit.cloud";
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDY2OTIxNTAsImlzcyI6IkFQSWRRbnpNOU5RcnJlUSIsIm5iZiI6MTc0NjY4NDk1MCwic3ViIjoicXVpY2tzdGFydCB1c2VyIHU3bjE0NSIsInZpZGVvIjp7ImNhblB1Ymxpc2giOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsInJvb20iOiJxdWlja3N0YXJ0IHJvb20iLCJyb29tSm9pbiI6dHJ1ZX19.d2mCyNCAvBWg8-2gVljhiIx28Nt-o-CyMCfu7hLWNPE";

async function connectToRoom() {
  try {
    const room = new LivekitClient.Room();

    // Connect to room
    await room.connect(wsURL, token);
    console.log("connected to room", room.name);

    // Publish local camera and mic tracks
    await room.localParticipant.enableCameraAndMicrophone();
    console.log("Publishing camera and microphone");
    // Get the video feed container
    const videoFeedContainer = document.getElementById("video-feed");

    // Create a video element for the local participant
    const localVideoElement = document.createElement("video");
    localVideoElement.autoplay = true;
    localVideoElement.playsInline = true;
    localVideoElement.muted = true; // Mute local video to prevent feedback
    localVideoElement.style.width = "100%";
    localVideoElement.style.maxWidth = "640px";

    // Attach the local participant's video track to the video element
    room.localParticipant.on("trackPublished", (publication) => {
      if (publication.kind === "video") {
        const videoTrack = publication.track;
        videoTrack.attach(localVideoElement);
        videoFeedContainer.appendChild(localVideoElement);
        console.log("Local video attached to DOM");
      }
    });

    // If tracks are already published, attach them
    room.localParticipant.tracks.forEach((publication) => {
      if (publication.kind === "video" && publication.track) {
        publication.track.attach(localVideoElement);
        videoFeedContainer.appendChild(localVideoElement);
        console.log("Local video attached to DOM (existing track)");
      }
    });
    // Handle disconnection
    room.on("disconnected", () => {
      console.log("Disconnected from room");
      // Try to reconnect after a delay
      setTimeout(() => connectToRoom(), 5000);
    });
  } catch (error) {
    console.error("Error connecting to room:", error);
    // Try to reconnect after a delay
    setTimeout(() => connectToRoom(), 5000);
  }
}

// Start connection
connectToRoom();

console.log("Webcam publisher started");
