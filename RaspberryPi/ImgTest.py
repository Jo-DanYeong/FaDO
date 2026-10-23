from pathlib import Path

import board
import busio
import digitalio
from PIL import Image, ImageOps
import adafruit_ssd1306


WIDTH = 128
HEIGHT = 64
IMAGE_PATH = Path(__file__).with_name("hachiware.jpeg")

# 하드웨어 초기화는 모듈을 처음 불러올 때 한 번 수행합니다.
oled_cs = digitalio.DigitalInOut(board.D8)
oled_dc = digitalio.DigitalInOut(board.D24)
oled_reset = digitalio.DigitalInOut(board.D25)

spi = busio.SPI(board.SCK, board.MOSI)
oled = adafruit_ssd1306.SSD1306_SPI(
    WIDTH, HEIGHT, spi, oled_dc, oled_reset, oled_cs
)
oled.fill(0)
oled.show()

def show_image():
    with Image.open(IMAGE_PATH) as raw_image:
        resized_image = ImageOps.contain(raw_image, (WIDTH, HEIGHT))
        canvas = Image.new("1", (WIDTH, HEIGHT), 0)

        paste_x = (WIDTH - resized_image.width) // 2
        paste_y = (HEIGHT - resized_image.height) // 2
        canvas.paste(resized_image.convert("1"), (paste_x, paste_y))

        oled.image(canvas)
        oled.show()