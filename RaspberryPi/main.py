import board
import busio
import digitalio
from PIL import Image, ImageDraw, ImageFont
import adafruit_circuitpython_ssd1306

# 1. SPI ��� �� �� ���� (�輱���� ��ġ�ؾ� �մϴ�)
spi = busio.SPI(board.SCK, board.MOSI)
dc = digitalio.DigitalInOut(board.D24)   # ���� 18�� ��
rst = digitalio.DigitalInOut(board.D25)  # ���� 22�� ��
cs = digitalio.DigitalInOut(board.D8)    # ���� 24�� ��

# 2. OLED ���÷��� �ʱ�ȭ (128x64 �ػ� ����)
# ���� ȭ���� �� �����ų� ������ ���÷��� ���μ��� ũ�⸦ �����ּ���.
WIDTH = 128
HEIGHT = 64
oled = adafruit_circuitpython_ssd1306.SSD1306_SPI(WIDTH, HEIGHT, spi, dc, rst, cs)

# 3. ȭ�� ����� (�ʱ�ȭ)
oled.fill(0)
oled.show()

# 4. PIL ���̺귯���� �׸� �̹��� ���� (1��Ʈ ��� ���)
image = Image.new("1", (oled.width, oled.height))
draw = ImageDraw.Draw(image)

# 5. ȭ�鿡 �׸� �ؽ�Ʈ�� �簢�� ����
font = ImageFont.load_default()
draw.rectangle((0, 0, oled.width - 1, oled.height - 1), outline=255, fill=0) # �׵θ� �簢��
draw.text((10, 15), "Raspberry Pi 4", font=font, fill=255)
draw.text((10, 35), "OLED SPI Test!", font=font, fill=255)

# 6. �̹����� ���÷��̷� �����Ͽ� ���
oled.image(image)
oled.show()
print("OLED ȭ�鿡 �ؽ�Ʈ�� ���������� ��µǾ����ϴ�!")
