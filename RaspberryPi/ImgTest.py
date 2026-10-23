import board
import busio
import digitalio
from PIL import Image
import adafruit_ssd1306

# 1. �� ���� (��� ������ ���� �� ���� ����)
oled_cs = digitalio.DigitalInOut(board.D8)
oled_dc = digitalio.DigitalInOut(board.D24)
oled_reset = digitalio.DigitalInOut(board.D25)

# 2. SPI �� ���÷��� ��ü �ʱ�ȭ (128x64 �ȼ� ����)
spi = busio.SPI(board.SCK, board.MOSI)
WIDTH = 128
HEIGHT = 64  # �� ���÷��̰� ���η� �� ��ٸ� 32�� �����ϼ���.
oled = adafruit_ssd1306.SSD1306_SPI(WIDTH, HEIGHT, spi, oled_dc, oled_reset, oled_cs)

# ȭ�� �ʱ�ȭ (�����ϰ� ����)
oled.fill(0)
oled.show()

try:
    # 3. �̹��� ���� �ҷ����� (�̹��� ���ϸ��� ��Ȯ�� �����ּ���)
    # ��: ���� �ȿ� �ִ� 'my_image.png' ���� �ҷ�����
    image_path = "my_image.png" 
    
    # �̹����� ����, ���÷��� ũ�⿡ �°� ũ�⸦ ������ �� 1��Ʈ ���(���ũ��) ���� ��ȯ�մϴ�.
    image = Image.open(image_path).resize((WIDTH, HEIGHT)).convert("1")

    # 4. �̹����� ���÷��̿� ���� �� ���
    oled.image(image)
    oled.show()
    print("�׸��� OLED ȭ�鿡 ���������� ǥ�õǾ����ϴ�!")

except FileNotFoundError:
    print(f"����: '{image_path}' ������ ã�� �� �����ϴ�. ���ϸ��� �´��� Ȯ���� �ּ���.")
