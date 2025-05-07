document.addEventListener("DOMContentLoaded", () => {
  const connectionStatus = document.getElementById("connection-status");
  const currentDirection = document.getElementById("current-direction");
  const buttons = {
    up: document.getElementById("up"),
    down: document.getElementById("down"),
    left: document.getElementById("left"),
    right: document.getElementById("right"),
  };

  let ws = null;
  let activeDirection = null;

  // Connect to WebSocket server
  function connectWebSocket() {
    // Get the current host and port
    const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const host = window.location.host;
    const wsUrl = `${protocol}${host}`;

    connectionStatus.textContent = "Connecting...";

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      connectionStatus.textContent = "Connected";
      connectionStatus.style.color = "green";
      console.log("WebSocket connected");
    };

    ws.onclose = () => {
      connectionStatus.textContent = "Disconnected";
      connectionStatus.style.color = "red";
      console.log("WebSocket disconnected");

      // Try to reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      connectionStatus.textContent = "Error";
      connectionStatus.style.color = "red";
    };
  }

  // Initialize WebSocket connection
  connectWebSocket();

  // Handle button press
  function handleButtonPress(direction) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    activeDirection = direction;
    currentDirection.textContent =
      direction.charAt(0).toUpperCase() + direction.slice(1);

    // Send direction command to the server
    ws.send(
      JSON.stringify({
        action: "move",
        direction: direction,
      })
    );

    console.log(`Sending direction: ${direction}`);
  }

  // Handle button release
  function handleButtonRelease() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !activeDirection) {
      return;
    }

    // Send stop command to the server
    ws.send(
      JSON.stringify({
        action: "stop",
      })
    );

    activeDirection = null;
    currentDirection.textContent = "None";
    console.log("Sending stop command");
  }

  // Add event listeners for mouse/touch events
  Object.keys(buttons).forEach((direction) => {
    const button = buttons[direction];

    // Mouse events
    button.addEventListener("mousedown", () => handleButtonPress(direction));
    button.addEventListener("mouseup", handleButtonRelease);
    button.addEventListener("mouseleave", handleButtonRelease);

    // Touch events for mobile
    button.addEventListener("touchstart", (e) => {
      e.preventDefault(); // Prevent default touch behavior
      handleButtonPress(direction);
    });
    button.addEventListener("touchend", (e) => {
      e.preventDefault(); // Prevent default touch behavior
      handleButtonRelease();
    });
  });

  // Add keyboard controls
  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };

  window.addEventListener("keydown", (e) => {
    const direction = keyMap[e.key];
    if (direction && !activeDirection) {
      buttons[direction].classList.add("active");
      handleButtonPress(direction);
    }
  });

  window.addEventListener("keyup", (e) => {
    const direction = keyMap[e.key];
    if (direction) {
      buttons[direction].classList.remove("active");
      handleButtonRelease();
    }
  });
});
