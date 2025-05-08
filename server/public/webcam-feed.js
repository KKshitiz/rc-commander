// LiveKit configuration
const wsURL = "wss://rc-jrdbc5kb.livekit.cloud";
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDY2OTIxNTAsImlzcyI6IkFQSWRRbnpNOU5RcnJlUSIsIm5iZiI6MTc0NjY4NDk1MCwic3ViIjoicXVpY2tzdGFydCB1c2VyIHU3bjE0NSIsInZpZGVvIjp7ImNhblB1Ymxpc2giOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsInJvb20iOiJxdWlja3N0YXJ0IHJvb20iLCJyb29tSm9pbiI6dHJ1ZX19.d2mCyNCAvBWg8-2gVljhiIx28Nt-o-CyMCfu7hLWNPE";

// Connect to LiveKit room and display video
async function connectToRoom() {
  try {
    const room = new LivekitClient.Room();

    // Set up event listener for when tracks are subscribed
    room.on(
      LivekitClient.RoomEvent.TrackSubscribed,
      (track, publication, participant) => {
        if (track.kind === LivekitClient.Track.Kind.Video) {
          // Attach video track to video element
          const videoElement = document.getElementById("video-feed");
          track.attach(videoElement);
          console.log("Video track attached", participant.identity);
        }
      }
    );

    // Add these lines right after creating the room
    room.on(LivekitClient.RoomEvent.ParticipantConnected, (participant) => {
      console.log("Participant connected:", participant.identity);
    });

    room.on(
      LivekitClient.RoomEvent.TrackPublished,
      (publication, participant) => {
        console.log(
          "Track published:",
          publication.trackSid,
          "by",
          participant.identity
        );
      }
    );

    room.on(LivekitClient.RoomEvent.ConnectionStateChanged, (state) => {
      console.log("Connection state:", state);
    });

    // Connect to room
    await room.connect(wsURL, token);
    console.log("Connected to room:", room.name);

    // For testing - if you want to publish from this client too
    // await room.localParticipant.enableCameraAndMicrophone();
  } catch (error) {
    console.error("Error connecting to LiveKit room:", error);
  }
}

// Connect when page loads
window.addEventListener("DOMContentLoaded", connectToRoom);
