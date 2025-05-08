#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char *ssid = "SF201_2.4";
const char *password = "stronghold";

// WebSocket server details
const char *websocket_server = "rc-commander.onrender.com";
const int websocket_port = 443;

// Motor control pins for L293D
const int LEFT_MOTOR_EN = D1;	// Enable pin for left motor
const int LEFT_MOTOR_IN1 = D5;	// Input 1 for left motor
const int LEFT_MOTOR_IN2 = D6;	// Input 2 for left motor
const int RIGHT_MOTOR_EN = D2;	// Enable pin for right motor
const int RIGHT_MOTOR_IN1 = D4; // Input 1 for right motor
const int RIGHT_MOTOR_IN2 = D3; // Input 2 for right motor

// Motor speed constants
const int MOTOR_SPEED = 255; // Full speed

WebSocketsClient webSocket;

// Function to control motor speed and direction
void setMotorSpeed(int enablePin, int in1Pin, int in2Pin, int speed)
{
	if (speed > 0)
	{
		digitalWrite(in1Pin, HIGH);
		digitalWrite(in2Pin, LOW);
	}
	else if (speed < 0)
	{
		digitalWrite(in1Pin, LOW);
		digitalWrite(in2Pin, HIGH);
	}
	else
	{
		digitalWrite(in1Pin, LOW);
		digitalWrite(in2Pin, LOW);
	}
	analogWrite(enablePin, abs(speed));
}

// Function to control differential drive
void controlMotors(int leftSpeed, int rightSpeed)
{
	setMotorSpeed(LEFT_MOTOR_EN, LEFT_MOTOR_IN1, LEFT_MOTOR_IN2, leftSpeed);
	setMotorSpeed(RIGHT_MOTOR_EN, RIGHT_MOTOR_IN1, RIGHT_MOTOR_IN2, rightSpeed);
}

// Function to handle movement commands
void handleMovement(const char *direction)
{
	if (strcmp(direction, "left") == 0)
	{
		// Turn left: right motor forward, left motor backward
		controlMotors(-MOTOR_SPEED, MOTOR_SPEED);
	}
	else if (strcmp(direction, "right") == 0)
	{
		// Turn right: left motor forward, right motor backward
		controlMotors(MOTOR_SPEED, -MOTOR_SPEED);
	}
	else if (strcmp(direction, "up") == 0)
	{
		// Move forward: both motors forward
		controlMotors(MOTOR_SPEED, MOTOR_SPEED);
	}
	else if (strcmp(direction, "down") == 0)
	{
		// Move backward: both motors backward
		controlMotors(-MOTOR_SPEED, -MOTOR_SPEED);
	}
	else if (strcmp(direction, "stop") == 0)
	{
		// Stop: both motors off
		controlMotors(0, 0);
	}
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
	switch (type)
	{
	case WStype_DISCONNECTED:
		Serial.println("WebSocket Disconnected!");
		break;
	case WStype_CONNECTED:
		Serial.println("WebSocket Connected!");
		break;
	case WStype_TEXT:
		Serial.print("Received Message: ");
		Serial.println((char *)payload);

		// Parse JSON payload
		StaticJsonDocument<200> doc;
		DeserializationError error = deserializeJson(doc, (char *)payload);

		if (!error)
		{
			const char *action = doc["action"];
			if (strcmp(action, "move") == 0)
			{
				const char *direction = doc["direction"];
				handleMovement(direction);
				Serial.print("Moving: ");
				Serial.println(direction);
			}
			else if (strcmp(action, "stop") == 0)
			{
				handleMovement("stop");
				Serial.println("Stopping");
			}
		}
		else
		{
			Serial.print("JSON parsing failed: ");
			Serial.println(error.c_str());
		}
		break;
	}
}

void setup()
{
	Serial.begin(115200);

	// Initialize motor control pins
	pinMode(LEFT_MOTOR_EN, OUTPUT);
	pinMode(LEFT_MOTOR_IN1, OUTPUT);
	pinMode(LEFT_MOTOR_IN2, OUTPUT);
	pinMode(RIGHT_MOTOR_EN, OUTPUT);
	pinMode(RIGHT_MOTOR_IN1, OUTPUT);
	pinMode(RIGHT_MOTOR_IN2, OUTPUT);

	// Initially stop motors
	controlMotors(0, 0);

	// Connect to WiFi
	WiFi.begin(ssid, password);
	Serial.print("Connecting to WiFi");

	while (WiFi.status() != WL_CONNECTED)
	{
		delay(500);
		Serial.print(".");
	}

	Serial.println("\nConnected to WiFi");
	Serial.print("IP Address: ");
	Serial.println(WiFi.localIP());

	// Initialize WebSocket connection
	webSocket.beginSslWithBundle(websocket_server, websocket_port, "/");
	webSocket.onEvent(webSocketEvent);
	webSocket.setReconnectInterval(5000);
}

void loop()
{
	webSocket.loop();
}
