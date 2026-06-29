/**
 * GradeA IoT Temperature Sensor Firmware
 * For: ESP32 DevKit + DS18B20 Temperature Probe(s)
 * 
 * HARDWARE NEEDED (~$12 total):
 *   - ESP32 DevKit v1            (~$5 on Amazon)
 *   - DS18B20 waterproof probe   (~$4 — use for fridge/freezer)
 *   - 4.7kΩ resistor            (~$0.10)
 *   - Breadboard + jumper wires  (~$3)
 * 
 * WIRING:
 *   DS18B20 RED wire   → ESP32 3.3V
 *   DS18B20 BLACK wire → ESP32 GND
 *   DS18B20 YELLOW wire → ESP32 GPIO4 (DATA pin)
 *   4.7kΩ resistor between DATA and 3.3V (pull-up)
 * 
 * LIBRARIES TO INSTALL (Arduino IDE → Manage Libraries):
 *   - OneWire by Paul Stoffregen
 *   - DallasTemperature by Miles Burton
 *   - ArduinoJson by Benoit Blanchon
 *   - HTTPClient (built-in with ESP32)
 * 
 * SETUP:
 *   1. Install Arduino IDE: https://www.arduino.cc/en/software
 *   2. Add ESP32 board: File → Preferences → Board Manager URL:
 *      https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
 *   3. Install libraries above
 *   4. Fill in WIFI_SSID, WIFI_PASSWORD, SENSOR_API_KEY below
 *   5. Flash to ESP32 via USB
 * 
 * SENSOR API KEY:
 *   Get your sensor API key from GradeA dashboard:
 *   Settings → IoT Sensors → Register Sensor → Copy API Key
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ─── CONFIGURATION — fill these in ─────────────────────────
const char* WIFI_SSID       = "YourRestaurantWiFi";
const char* WIFI_PASSWORD   = "YourWiFiPassword";
const char* SENSOR_API_KEY  = "your-sensor-api-key-from-gradea-dashboard";
const char* GRADEA_API_URL  = "https://your-backend.onrender.com/api/sensors/ingest";

// Temperature unit: true = Fahrenheit, false = Celsius
const bool USE_FAHRENHEIT = true;

// How often to send readings (milliseconds). 300000 = 5 minutes
const unsigned long SEND_INTERVAL = 300000;

// GPIO pin for DS18B20 data wire
const int ONE_WIRE_PIN = 4;

// Status LEDs (optional — wire LEDs with 220Ω resistors)
const int LED_GREEN = 2;   // Built-in LED on most ESP32 boards
const int LED_RED   = 13;  // Connect external LED
// ───────────────────────────────────────────────────────────

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

unsigned long lastSendTime = 0;
int failCount = 0;


void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n🌡️  GradeA Temperature Sensor v2.0");
  Serial.println("====================================");

  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  // Initialize temperature sensors
  sensors.begin();
  int deviceCount = sensors.getDeviceCount();
  Serial.printf("Found %d DS18B20 sensor(s)\n", deviceCount);
  if (deviceCount == 0) {
    Serial.println("ERROR: No sensors found. Check wiring!");
    blinkError();
  }

  // Connect to WiFi
  connectWiFi();

  // Send first reading immediately
  sendReading();
}


void loop() {
  // Reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost — reconnecting...");
    connectWiFi();
  }

  // Send on interval
  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL) {
    sendReading();
    lastSendTime = now;
  }

  delay(1000);
}


void connectWiFi() {
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Signal strength: %d dBm\n", WiFi.RSSI());
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_RED, LOW);
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    digitalWrite(LED_RED, HIGH);
    digitalWrite(LED_GREEN, LOW);
  }
}


void sendReading() {
  // Request temperature from all sensors
  sensors.requestTemperatures();
  delay(750); // DS18B20 conversion time

  int deviceCount = sensors.getDeviceCount();

  for (int i = 0; i < deviceCount; i++) {
    float tempC = sensors.getTempCByIndex(i);

    if (tempC == DEVICE_DISCONNECTED_C) {
      Serial.printf("Sensor %d disconnected!\n", i);
      continue;
    }

    float tempValue = USE_FAHRENHEIT ? sensors.toFahrenheit(tempC) : tempC;
    const char* unit = USE_FAHRENHEIT ? "F" : "C";

    Serial.printf("Sensor %d: %.1f°%s\n", i, tempValue, unit);

    // Build JSON payload
    StaticJsonDocument<256> doc;
    doc["api_key"]     = SENSOR_API_KEY;
    doc["value"]       = tempValue;
    doc["unit"]        = unit;
    doc["battery_pct"] = getBatteryPercent();
    doc["rssi"]        = WiFi.RSSI();
    doc["device_id"]   = WiFi.macAddress();

    String payload;
    serializeJson(doc, payload);

    // Send to GradeA API
    bool success = postToAPI(payload);

    if (success) {
      Serial.printf("✅ Sent %.1f°%s to GradeA\n", tempValue, unit);
      failCount = 0;
      flashGreen();
    } else {
      failCount++;
      Serial.printf("❌ Failed to send (attempt %d)\n", failCount);
      flashRed();

      // Retry once after 10 seconds if first fail
      if (failCount == 1) {
        delay(10000);
        postToAPI(payload);
      }
    }
  }

  lastSendTime = millis();
}


bool postToAPI(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(GRADEA_API_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 second timeout

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    String response = http.getString();
    Serial.printf("API response: %s\n", response.c_str());
    http.end();
    return true;
  } else {
    Serial.printf("API error: HTTP %d\n", httpCode);
    if (httpCode > 0) {
      Serial.println(http.getString());
    }
    http.end();
    return false;
  }
}


int getBatteryPercent() {
  // If using USB power, return 100
  // For battery-powered setups, read ADC pin
  // int raw = analogRead(34);  // Battery voltage divider on GPIO34
  // float voltage = raw * 3.3 / 4095 * 2;  // 2:1 divider
  // return constrain((int)((voltage - 3.3) / (4.2 - 3.3) * 100), 0, 100);
  return 100; // USB powered — return 100
}


void flashGreen() {
  digitalWrite(LED_GREEN, HIGH);
  delay(100);
  digitalWrite(LED_GREEN, LOW);
  delay(100);
  digitalWrite(LED_GREEN, HIGH);
}


void flashRed() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_RED, HIGH);
    delay(200);
    digitalWrite(LED_RED, LOW);
    delay(200);
  }
}


void blinkError() {
  while (true) {
    digitalWrite(LED_RED, HIGH);
    delay(500);
    digitalWrite(LED_RED, LOW);
    delay(500);
  }
}

/**
 * MULTI-PROBE SETUP (for monitoring multiple locations):
 * 
 * You can connect up to 10 DS18B20 sensors on a single wire!
 * Each will have a unique address. Register each sensor separately
 * in the GradeA dashboard and assign different API keys.
 * 
 * For multi-probe: use /api/sensors/ingest endpoint for each sensor,
 * or use the /api/sensors/bulk-ingest endpoint for batch readings.
 * 
 * COMMERCIAL ALTERNATIVES (no soldering needed):
 * 
 * 1. Govee H5074 WiFi Hygrometer (~$15)
 *    - Built-in WiFi, free cloud API
 *    - Use a Python script to forward readings to GradeA
 *    - See: gradea.app/docs/govee-integration
 * 
 * 2. SensorPush HT1 (~$49)
 *    - BLE + cloud, has REST API
 *    - More accurate, battery-powered
 *    - See: gradea.app/docs/sensorpush-integration
 * 
 * 3. Inkbird IBS-TH2 (~$18)
 *    - BLE, good accuracy, long battery life
 *    - Use Raspberry Pi as BLE gateway
 * 
 * TEMPERATURE PLACEMENT GUIDE:
 * 
 * Walk-in Refrigerator:  Probe near door (warmest spot)
 * Walk-in Freezer:       Center of unit
 * Reach-in Fridge:       Middle shelf
 * Hot Holding:           Near the food (not just air temp)
 * Prep Station:          On the food surface
 */
