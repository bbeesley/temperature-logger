import adafruit_requests
import board
import json
import socketpool
import socketpool
import ssl
import time
import wifi
import feathers2neo
from adafruit_bme280 import basic as adafruit_bme280

# setup wifi
requests = None
try:
    from secrets import secrets
except ImportError:
    print("WiFi secrets are kept in secrets.py, please add them there!")
    raise

print("Available WiFi networks:")
for network in wifi.radio.start_scanning_networks():
    print(
        "\t%s\t\tRSSI: %d\tChannel: %d"
        % (str(network.ssid, "utf-8"), network.rssi, network.channel)
    )
wifi.radio.stop_scanning_networks()
print("Connecting to %s" % secrets["ssid"])
wifi.radio.connect(secrets["ssid"], secrets["password"])
print("Connected to %s!" % secrets["ssid"])
print("My IP address is", wifi.radio.ipv4_address)
pool = socketpool.SocketPool(wifi.radio)
requests = adafruit_requests.Session(pool, ssl.create_default_context())

# setup temperature sensor libs
i2c = board.I2C()
bme280 = adafruit_bme280.Adafruit_BME280_I2C(i2c)

DATA_LOGGER_ENDPOINT = (
    "https://xxxxxxxx.execute-api.eu-west-1.amazonaws.com/measurements"
)
device_id = "logger01"
headers = {"x-api-key": "###API_KEY###"}
pending_measurement = None


def check_charge_status():
    voltage = feathers2neo.get_battery_voltage()
    print("battery voltage: ", voltage)
    if voltage > 0:
        level = 0
        voltage = feathers2neo.get_battery_voltage()
        if voltage > 3.71:
            level = int(2.5 * 1.5)
        if voltage > 3.75:
            level = int(2.5 * 2.5)
        if voltage > 3.79:
            level = int(2.5 * 3.5)
        if voltage > 3.82:
            level = int(2.5 * 4.5)
        if voltage > 3.85:
            level = int(2.5 * 5.5)
        if voltage > 3.91:
            level = int(2.5 * 6.5)
        if voltage > 3.98:
            level = int(2.5 * 7.5)
        if voltage > 4.08:
            level = int(2.5 * 8.5)
        if voltage > 4.15:
            level = 25
        print("battery level: ", level)


while True:
    check_charge_status()
    # create payload
    try:
        measurement = {
            "temperature": bme280.temperature,
            "humidity": bme280.humidity,
            "pressure": bme280.pressure,
            "logger": device_id,
        }
        pending_measurements = measurement
    except RuntimeError as e:
        print("could not get temperature measurement: ", e)
        time.sleep(60)
        continue

    try:
        json_data = json.dumps(pending_measurements)
        print("POSTing data to {0}: {1}".format(DATA_LOGGER_ENDPOINT, json_data))
        response = requests.post(
            DATA_LOGGER_ENDPOINT, json=pending_measurements, headers=headers
        )
        print("-" * 40)
        json_resp = response.json()
        print("JSON Data received by server:", json_resp["status"])
        print("-" * 40)
        response.close()
        pending_measurements.clear()
    except RuntimeError as e:
        print("could not send measurements: ", e)

    time.sleep(60)
