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
  // Track active directions as a Set instead of a single value
  let activeDirections = new Set();

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

  // Update the current direction display
  function updateDirectionDisplay() {
    if (activeDirections.size === 0) {
      currentDirection.textContent = "None";
    } else {
      currentDirection.textContent = Array.from(activeDirections)
        .map((dir) => dir.charAt(0).toUpperCase() + dir.slice(1))
        .join(" + ");
    }
  }

  // Handle button press
  function handleButtonPress(direction) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Skip if this direction is already active
    if (activeDirections.has(direction)) {
      return;
    }

    // Add to active directions
    activeDirections.add(direction);
    console.log(`Sending direction: ${direction}`);

    // Update display
    updateDirectionDisplay();

    // Send direction command to the server
    ws.send(
      JSON.stringify({
        action: "move",
        direction: direction,
      })
    );

    // Highlight the button
    if (buttons[direction]) {
      buttons[direction].classList.add("active");
    }
  }

  // Handle button release
  function handleButtonRelease(direction) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Skip if this direction is not active
    if (!activeDirections.has(direction)) {
      return;
    }

    // Remove from active directions
    activeDirections.delete(direction);
    console.log(`Stopping direction: ${direction}`);

    // Update display
    updateDirectionDisplay();

    // Send stop command to the server with the direction that was released
    ws.send(
      JSON.stringify({
        action: "stop",
        direction: direction,
      })
    );

    // Remove highlight from the button
    if (buttons[direction]) {
      buttons[direction].classList.remove("active");
    }
  }

  // Add event listeners for mouse/touch events
  Object.keys(buttons).forEach((direction) => {
    const button = buttons[direction];

    // Mouse events
    button.addEventListener("mousedown", () => handleButtonPress(direction));
    button.addEventListener("mouseup", () => handleButtonRelease(direction));
    button.addEventListener("mouseleave", () => handleButtonRelease(direction));

    // Touch events for mobile
    button.addEventListener("touchstart", (e) => {
      e.preventDefault(); // Prevent default touch behavior
      handleButtonPress(direction);
    });
    button.addEventListener("touchend", (e) => {
      e.preventDefault(); // Prevent default touch behavior
      handleButtonRelease(direction);
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
    if (direction) {
      // Prevent key repeat from triggering multiple events
      if (e.repeat) return;
      handleButtonPress(direction);
    }
  });

  window.addEventListener("keyup", (e) => {
    const direction = keyMap[e.key];
    if (direction) {
      handleButtonRelease(direction);
    }
  });
});
