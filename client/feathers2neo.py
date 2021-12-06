# FeatherS2 Neo Helper Library
# 2021 Seon Rozenblum, Unexpected Maker
#
# Project home:
#   https://feathers2neo.io
#

# Import required libraries
import board
from digitalio import DigitalInOut, Direction
from analogio import AnalogIn

# Setup the NeoPixel power pins
pixel_power = DigitalInOut(board.NEOPIXEL_POWER)
pixel_power.direction = Direction.OUTPUT
pixel_power.value = True

pixel_matrix_power = DigitalInOut(board.NEOPIXEL_MATRIX_POWER)
pixel_matrix_power.direction = Direction.OUTPUT

# Setup the BATTERY voltage sense pin
vbat_voltage = AnalogIn(board.BATTERY)

# Setup the VBUS sense pin
vbus_sense = DigitalInOut(board.VBUS_SENSE)
vbus_sense.direction = Direction.INPUT


class matrix_animation:
    def __init__(self, matrix, anim_type, trail_length):

        # List of animation shapes by pixel index
        # Pixel 0 is Top Left, pixels increase vertically by row
        # Feel free to make your own shapes!
        self.matrix_display_shapes = {
            "square": [0, 1, 2, 3, 4, 9, 14, 19, 24, 23, 22, 21, 20, 15, 10, 5],
            "circle": [1, 2, 3, 9, 14, 19, 23, 22, 21, 15, 10, 5],
            "diamond": [2, 8, 14, 18, 22, 16, 10, 6],
            "plus": [2, 7, 12, 17, 22, 10, 11, 12, 13, 14],
            "cross": [0, 6, 12, 18, 24, 4, 8, 12, 16, 20],
            "spiral": [
                12,
                13,
                18,
                17,
                16,
                11,
                6,
                7,
                8,
                9,
                14,
                19,
                24,
                23,
                22,
                21,
                20,
                15,
                10,
                5,
                0,
                1,
                2,
                3,
                4,
                9,
                14,
                19,
                24,
                23,
                22,
                21,
                20,
                15,
                10,
                5,
                6,
                7,
                8,
                13,
                18,
                17,
                16,
                11,
                12,
                -1,
                -1,
                -1,
                -1,
                -1,
                -1,
                -1,
            ],
        }

        # Initialisation error status
        self.error = False

        if anim_type not in self.matrix_display_shapes:
            print(
                f"** '{anim_type}' not found in list of shapes!\n** Animation halted!"
            )
            self.error = True
        elif trail_length < 1 or trail_length > 20:
            print(
                f"** trail_length cannot be {trail_length}. Please pick a value between 1 and 20!\n** Animation halted!"
            )
            self.error = True

        if not self.error:
            self.matrix = matrix
            self.anim_type = anim_type
            self.trail_length = trail_length + 1

            # Create the trail list base don the length of the trail
            self.anim_trail = [x for x in range(0, -self.trail_length, -1)]

            # Create a reference to the selected animation list
            self.current_anim = self.matrix_display_shapes[self.anim_type]

    def get_alpha(self):
        return 0.2 * (self.trail_length - 1)

    def inc_anim_index(self, index):
        self.anim_trail[index] += 1
        if self.anim_trail[index] == len(self.current_anim):
            self.anim_trail[index] = 0

    def get_anim_index(self, index):
        return self.current_anim[self.anim_trail[index]]

    def animate(self, r, g, b):
        if not self.error:
            alpha = self.get_alpha()
            for index in range(self.trail_length):
                if self.anim_trail[index] > -1:
                    (r2, g2, b2) = r * alpha, g * alpha, b * alpha
                    if self.get_anim_index(index) > -1:
                        self.matrix[self.get_anim_index(index)] = (r2, g2, b2)
                    alpha = alpha - 0.2 if alpha > 0.2 else 0

                self.inc_anim_index(index)


def set_pixel_matrix_power(state):
    """Enable or Disable power to the onboard NeoPixel to either show colour, or to reduce power fro deep sleep."""
    global pixel_matrix_power
    pixel_matrix_power.value = state


def get_battery_voltage():
    """Get the approximate battery voltage."""
    # I don't really understand what CP is doing under the hood here for the ADC range & calibration,
    # but the onboard voltage divider for VBAT sense is setup to deliver 1.1V to the ADC based on it's
    # default factory configuration.
    # This forumla should show the nominal 4.2V max capacity (approximately) when 5V is present and the
    # VBAT is in charge state for a 1S LiPo battery with a max capacity of 4.2V
    global vbat_voltage
    return round(vbat_voltage.value / 5370, 2)


def get_vbus_present():
    """Detect if VBUS (5V) power source is present"""
    global vbus_sense
    return vbus_sense.value


def rgb_color_wheel(wheel_pos):
    """Color wheel to allow for cycling through the rainbow of RGB colors."""
    wheel_pos = wheel_pos % 255

    if wheel_pos < 85:
        return 255 - wheel_pos * 3, 0, wheel_pos * 3
    elif wheel_pos < 170:
        wheel_pos -= 85
        return 0, wheel_pos * 3, 255 - wheel_pos * 3
    else:
        wheel_pos -= 170
        return wheel_pos * 3, 255 - wheel_pos * 3, 0


set_pixel_matrix_power(False)
