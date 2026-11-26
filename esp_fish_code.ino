#define CUSTOM_SETTINGS
#define INCLUDE_GAMEPAD_MODULE
#include <DabbleESP32.h>

#define HC12_RX 16
#define HC12_TX 17

char lastMotorCmd = 'S';
char lastRudderCmd = 'C';
char lastFinsCmd = 'N';
unsigned long lastHeartbeat = 0;

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, HC12_RX, HC12_TX);
  Dabble.begin("RoboticFish"); // Bluetooth name shown in Dabble app
  Serial.println("ESP32 Transmitter Ready! Connect Dabble GamePad...");
}

void loop() {
  Dabble.processInput();

  // 1. Crank Motor (UP = ON, Release = OFF)
  char motorCmd = GamePad.isUpPressed() ? 'F' : 'S';
  if (motorCmd != lastMotorCmd) {
    Serial2.write(motorCmd);
    lastMotorCmd = motorCmd;
    if (motorCmd == 'F') {
      Serial.println("motor ON");
    } else {
      Serial.println("motor OFF");
    }
  }

  // 2. Rudder (LEFT / RIGHT, Release = CENTERED)
  char rudderCmd = 'C';
  if (GamePad.isLeftPressed()) {
    rudderCmd = 'L';
  } else if (GamePad.isRightPressed()) {
    rudderCmd = 'R';
  }
  if (rudderCmd != lastRudderCmd) {
    Serial2.write(rudderCmd);
    lastRudderCmd = rudderCmd;
    if (rudderCmd == 'L') {
      Serial.println("rudder LEFT");
    } else if (rudderCmd == 'R') {
      Serial.println("rudder RIGHT");
    } else {
      Serial.println("rudder CENTERED");
    }
  }

  // 3. Side Fins (Cross/X = down, Circle/O = up, Release = centered)
  char finsCmd = 'N';
  if (GamePad.isCrossPressed()) {
    finsCmd = 'D';
  } else if (GamePad.isCirclePressed()) {
    finsCmd = 'U';
  }
  if (finsCmd != lastFinsCmd) {
    Serial2.write(finsCmd);
    lastFinsCmd = finsCmd;
    if (finsCmd == 'D') {
      Serial.println("fins down");
    } else if (finsCmd == 'U') {
      Serial.println("fins up");
    } else {
      Serial.println("fins centered");
    }
  }

  // 4. Silent Heartbeat every 500ms (keeps Uno failsafe happy)
  if (millis() - lastHeartbeat >= 500) {
    Serial2.write('H');
    lastHeartbeat = millis();
  }

  delay(20);
}
