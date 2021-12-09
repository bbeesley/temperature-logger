import adafruit_requests
import board
import json
import socketpool
import secrets
import ssl
import time
import wifi
from adafruit_bme280 import basic as adafruit_bme280
from adafruit_lc709203f import LC709203F, PackSize

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

device_id = "compact-logger-01"
headers = {"x-api-key": secrets["api_key"]}
pending_measurement = None

battery_sensor = LC709203F(board.I2C())
battery_sensor.pack_size = PackSize.MAH3000

def check_charge_status():
    print("Battery percentage: %0.1f %%" % (battery_sensor.cell_percent))


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
        print(
            "POSTing data to {0}: {1}".format(
                secrets["data_logger_endpoint"], json_data
            )
        )
        response = requests.post(
            secrets["data_logger_endpoint"], json=pending_measurements, headers=headers
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
