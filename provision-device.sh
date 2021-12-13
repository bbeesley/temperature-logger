#!/bin/sh

SENSOR_NAME="$1"

cat << EOF > client/config.py
config = {
  "name":"${SENSOR_NAME:-sensor01}"
}
EOF

rsync --delete -rhv "client/" "/Volumes/CIRCUITPY"
