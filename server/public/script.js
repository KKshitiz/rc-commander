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

  // =============================
  // Gamepad/Controller Support
  // =============================
  // This section adds support for gamepads/controllers using the Gamepad API.
  // It maps D-pad and left stick to up/down/left/right and triggers the existing handlers.
  // No changes are made to existing logic above.

  // Gamepad status indicator
  const gamepadStatus = document.getElementById("gamepad-status");
  if (gamepadStatus) {
    gamepadStatus.textContent = "No gamepad detected";
    gamepadStatus.style.color = "gray";
  }

  (function () {
    // Map gamepad buttons/axes to directions
    const gamepadDirectionMap = {
      12: "up", // D-pad up
      13: "down", // D-pad down
      14: "left", // D-pad left
      15: "right", // D-pad right
    };
    // Axes: 0 = left/right, 1 = up/down
    const AXIS_THRESHOLD = 0.6; // Increased deadzone for less jitter
    const AXIS_RELEASE_ZONE = 0.3; // Must be within this to release
    let prevGamepadState = {
      up: false,
      down: false,
      left: false,
      right: false,
    };
    let gamepadConnected = false;

    window.addEventListener("gamepadconnected", (e) => {
      gamepadConnected = true;
      console.log(
        `Gamepad connected: index=${e.gamepad.index}, id=${e.gamepad.id}`
      );
      if (gamepadStatus) {
        gamepadStatus.textContent = "Gamepad connected";
        gamepadStatus.style.color = "green";
      }
    });
    window.addEventListener("gamepaddisconnected", (e) => {
      gamepadConnected = false;
      console.log(
        `Gamepad disconnected: index=${e.gamepad.index}, id=${e.gamepad.id}`
      );
      // Release all directions on disconnect
      Object.keys(prevGamepadState).forEach((dir) => {
        if (prevGamepadState[dir]) {
          handleButtonRelease(dir);
          prevGamepadState[dir] = false;
        }
      });
      if (gamepadStatus) {
        gamepadStatus.textContent = "No gamepad detected";
        gamepadStatus.style.color = "gray";
      }
    });

    function pollGamepad() {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (!gamepads) return;
      let gp = null;
      // Use the first connected gamepad
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          gp = gamepads[i];
          break;
        }
      }
      if (!gp) {
        // If previously connected, release all
        if (gamepadConnected) {
          Object.keys(prevGamepadState).forEach((dir) => {
            if (prevGamepadState[dir]) {
              handleButtonRelease(dir);
              prevGamepadState[dir] = false;
            }
          });
          gamepadConnected = false;
        }
        requestAnimationFrame(pollGamepad);
        return;
      }
      // D-pad buttons
      Object.entries(gamepadDirectionMap).forEach(([btnIdx, dir]) => {
        const pressed = gp.buttons[btnIdx] && gp.buttons[btnIdx].pressed;
        if (pressed && !prevGamepadState[dir]) {
          handleButtonPress(dir);
          prevGamepadState[dir] = true;
        } else if (!pressed && prevGamepadState[dir]) {
          handleButtonRelease(dir);
          prevGamepadState[dir] = false;
        }
      });
      // Left stick axes
      const axisX = gp.axes[0] || 0;
      const axisY = gp.axes[1] || 0;
      // Up
      if (axisY < -AXIS_THRESHOLD && !prevGamepadState.up) {
        handleButtonPress("up");
        prevGamepadState.up = true;
      } else if (
        axisY > -AXIS_RELEASE_ZONE &&
        prevGamepadState.up &&
        !gp.buttons[12]?.pressed
      ) {
        // Only release if D-pad up is not pressed and stick is well within deadzone
        handleButtonRelease("up");
        prevGamepadState.up = false;
      }
      // Down
      if (axisY > AXIS_THRESHOLD && !prevGamepadState.down) {
        handleButtonPress("down");
        prevGamepadState.down = true;
      } else if (
        axisY < AXIS_RELEASE_ZONE &&
        prevGamepadState.down &&
        !gp.buttons[13]?.pressed
      ) {
        handleButtonRelease("down");
        prevGamepadState.down = false;
      }
      // Left
      if (axisX < -AXIS_THRESHOLD && !prevGamepadState.left) {
        handleButtonPress("left");
        prevGamepadState.left = true;
      } else if (
        axisX > -AXIS_RELEASE_ZONE &&
        prevGamepadState.left &&
        !gp.buttons[14]?.pressed
      ) {
        handleButtonRelease("left");
        prevGamepadState.left = false;
      }
      // Right
      if (axisX > AXIS_THRESHOLD && !prevGamepadState.right) {
        handleButtonPress("right");
        prevGamepadState.right = true;
      } else if (
        axisX < AXIS_RELEASE_ZONE &&
        prevGamepadState.right &&
        !gp.buttons[15]?.pressed
      ) {
        handleButtonRelease("right");
        prevGamepadState.right = false;
      }
      requestAnimationFrame(pollGamepad);
    }

    // Start polling
    requestAnimationFrame(pollGamepad);
  })();

  // Show/hide D-pad and joystick based on control mode toggle
  const dpad = document.querySelector(".d-pad");
  const joystickContainer = document.getElementById("joystick-container");
  const controlModeToggle = document.getElementById("control-mode-toggle");
  if (controlModeToggle && dpad && joystickContainer) {
    controlModeToggle.addEventListener("change", (e) => {
      const mode = controlModeToggle.querySelector(
        'input[name="control-mode"]:checked'
      ).value;
      if (mode === "dpad") {
        dpad.style.display = "";
        joystickContainer.style.display = "none";
      } else {
        dpad.style.display = "none";
        joystickContainer.style.display = "";
      }
    });
  }

  // Joystick control logic
  (function () {
    const joystickContainer = document.getElementById("joystick-container");
    const joystickKnob = document.getElementById("joystick-knob");
    const joystickBase = document.getElementById("joystick-base");
    if (!joystickContainer || !joystickKnob || !joystickBase) return;

    const baseSize = 120; // px
    const knobSize = 48; // px
    const center = baseSize / 2;
    const maxRadius = (baseSize - knobSize) / 2;
    const directionThreshold = 24; // px, how far from center to trigger a direction
    let dragging = false;
    let activeDirections = new Set();

    function getDirection(dx, dy) {
      // dx, dy: offset from center
      const directions = [];
      if (dy < -directionThreshold) directions.push("up");
      if (dy > directionThreshold) directions.push("down");
      if (dx < -directionThreshold) directions.push("left");
      if (dx > directionThreshold) directions.push("right");
      return directions;
    }

    function setKnobPosition(dx, dy) {
      // Clamp to maxRadius
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxRadius) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * maxRadius;
        dy = Math.sin(angle) * maxRadius;
      }
      joystickKnob.style.left = `${center - knobSize / 2 + dx}px`;
      joystickKnob.style.top = `${center - knobSize / 2 + dy}px`;
    }

    function resetKnob() {
      setKnobPosition(0, 0);
    }

    function updateDirections(newDirections) {
      // Release directions not in newDirections
      for (const dir of activeDirections) {
        if (!newDirections.includes(dir)) {
          handleButtonRelease(dir);
        }
      }
      // Press new directions
      for (const dir of newDirections) {
        if (!activeDirections.has(dir)) {
          handleButtonPress(dir);
        }
      }
      activeDirections = new Set(newDirections);
    }

    function onDrag(clientX, clientY) {
      const rect = joystickBase.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const dx = x - center;
      const dy = y - center;
      setKnobPosition(dx, dy);
      const dirs = getDirection(dx, dy);
      updateDirections(dirs);
    }

    function stopDrag() {
      dragging = false;
      resetKnob();
      updateDirections([]);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd);
    }

    function mouseMove(e) {
      if (!dragging) return;
      onDrag(e.clientX, e.clientY);
    }
    function mouseUp() {
      stopDrag();
    }
    function touchMove(e) {
      if (!dragging) return;
      const t = e.touches[0];
      onDrag(t.clientX, t.clientY);
    }
    function touchEnd() {
      stopDrag();
    }

    joystickKnob.addEventListener("mousedown", (e) => {
      if (joystickContainer.style.display === "none") return;
      dragging = true;
      e.preventDefault();
      window.addEventListener("mousemove", mouseMove);
      window.addEventListener("mouseup", mouseUp);
    });
    joystickKnob.addEventListener("touchstart", (e) => {
      if (joystickContainer.style.display === "none") return;
      dragging = true;
      e.preventDefault();
      window.addEventListener("touchmove", touchMove, { passive: false });
      window.addEventListener("touchend", touchEnd);
    });
    // Reset knob and release directions when switching away from joystick
    if (controlModeToggle) {
      controlModeToggle.addEventListener("change", () => {
        if (joystickContainer.style.display === "none") {
          resetKnob();
          updateDirections([]);
        }
      });
    }
    // Always reset on page load
    resetKnob();
    updateDirections([]);
  })();
});
