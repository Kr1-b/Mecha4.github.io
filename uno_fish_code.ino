#include <AltSoftSerial.h>
#include <ServoTimer2Plus.h>

AltSoftSerial hc12; // Hardwired to Pin 8 (RX) and Pin 9 (TX) on Uno

ServoTimer2Plus rudderServo;
ServoTimer2Plus leftFinServo;
ServoTimer2Plus rightFinServo;

const int rudderPin = 3;
const int relayPin = 4;
const int leftFinPin = 5;
const int rightFinPin = 6;

const int RELAY_ON = LOW;
const int RELAY_OFF = HIGH;

// Servo pulse widths in microseconds (1500 = 90 deg center)
const int CENTER = 1500;
const int LEFT_ANGLE = 1125;   // ~45 deg
const int RIGHT_ANGLE = 1875;  // ~135 deg
const int FIN_UP = 1790;       // ~125 deg
const int FIN_DOWN = 1210;     // ~55 deg

unsigned long lastSignalTime = 0;
const unsigned long FAILSAFE_TIMEOUT = 1500; // 1.5 seconds without signal
bool failsafeTriggered = false;

void centerAllAndStop() {
  digitalWrite(relayPin, RELAY_OFF);
  rudderServo.write(CENTER);
  leftFinServo.write(CENTER);
  rightFinServo.write(CENTER);
}

void setup() {
  Serial.begin(9600);
  hc12.begin(9600);

  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, RELAY_OFF);

  rudderServo.attach(rudderPin);
  leftFinServo.attach(leftFinPin);
  rightFinServo.attach(rightFinPin);

  centerAllAndStop();
  lastSignalTime = millis();
  Serial.println("Uno Receiver Ready! Waiting for ESP32...");
}

void loop() {
  if (hc12.available()) {
    char cmd = hc12.read();
    lastSignalTime = millis(); // Reset failsafe timer on any valid byte

    if (failsafeTriggered) {
      failsafeTriggered = false;
      Serial.println("Signal restored!");
    }

    switch (cmd) {
      case 'F':
        digitalWrite(relayPin, RELAY_ON);
        Serial.println("motor ON");
        break;
      case 'S':
        digitalWrite(relayPin, RELAY_OFF);
        Serial.println("motor OFF");
        break;

      case 'L':
        rudderServo.write(LEFT_ANGLE);
        Serial.println("rudder LEFT");
        break;
      case 'R':
        rudderServo.write(RIGHT_ANGLE);
        Serial.println("rudder RIGHT");
        break;
      case 'C':
        rudderServo.write(CENTER);
        Serial.println("rudder CENTERED");
        break;

      case 'U':
        leftFinServo.write(FIN_UP);
        rightFinServo.write(FIN_DOWN);
        Serial.println("fins up");
        break;
      case 'D':
        leftFinServo.write(FIN_DOWN);
        rightFinServo.write(FIN_UP);
        Serial.println("fins down");
        break;
      case 'N':
        leftFinServo.write(CENTER);
        rightFinServo.write(CENTER);
        Serial.println("fins centered");
        break;

      case 'H':
        // Quiet heartbeat received - keeps failsafe timer alive
        break;
    }
  }

  // Auto-stop failsafe if radio signal drops for > 1.5 seconds
  if (!failsafeTriggered && (millis() - lastSignalTime > FAILSAFE_TIMEOUT)) {
    centerAllAndStop();
    failsafeTriggered = true;
    Serial.println("FAILSAFE: Signal lost -> motor OFF & servos CENTERED");
  }
}
