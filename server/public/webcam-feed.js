// LiveKit configuration
const wsURL = "wss://rc-jrdbc5kb.livekit.cloud";

// Function to generate a random username
function generateRandomUsername() {
  const adjectives = [
    "Happy",
    "Brave",
    "Swift",
    "Clever",
    "Mighty",
    "Nimble",
    "Daring",
    "Curious",
    "Bright",
    "Agile",
  ];
  const nouns = [
    "Racer",
    "Driver",
    "Pilot",
    "Captain",
    "Navigator",
    "Explorer",
    "Rider",
    "Commander",
    "Controller",
    "Operator",
  ];

  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);

  return `${randomAdjective}${randomNoun}${randomNumber}`;
}

// Function to fetch token from server
async function fetchToken() {
  try {
    const participantName = generateRandomUsername();
    console.log("Generated username:", participantName);

    const usernameElement = document.getElementById("username");
    usernameElement.textContent = participantName;

    const response = await fetch(`/join?name=${participantName}`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.accessToken;
  } catch (error) {
    console.error("Error fetching token:", error);
    throw error;
  }
}

// Connect to LiveKit room and display video
async function connectToRoom() {
  try {
    const token = await fetchToken();
    console.log("Token received successfully");

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
