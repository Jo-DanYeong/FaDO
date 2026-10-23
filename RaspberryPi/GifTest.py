import time
import board
import busio
import digitalio
from PIL import Image, ImageOps, ImageSequence, ImageEnhance  # ImageEnhance 추가
import adafruit_ssd1306

# 1. 디스플레이 및 핀 설정 (물리 핀 기준)
oled_cs = digitalio.DigitalInOut(board.D8)
oled_dc = digitalio.DigitalInOut(board.D24)
oled_reset = digitalio.DigitalInOut(board.D25)

spi = busio.SPI(board.SCK, board.MOSI)
WIDTH = 128
HEIGHT = 64  # 세로가 얇은 모델이면 32로 변경
oled = adafruit_ssd1306.SSD1306_SPI(WIDTH, HEIGHT, spi, oled_dc, oled_reset, oled_cs)

# 2. GIF 파일 불러오기
gif_path = "sample.gif"  # 재생할 GIF 파일명

try:
    gif = Image.open(gif_path)
except FileNotFoundError:
    print(f"에러: {gif_path} 파일을 찾을 수 없습니다. 파일명을 확인해 주세요.")
    exit()

print("노이즈 억제 모드로 GIF 재생을 시작합니다. (종료: Ctrl+C)")

try:
    while True:  # 무한 반복 재생
        for frame in ImageSequence.Iterator(gif):
            start_time = time.time()

            # 3. 비율 유지 크기 조정
            # 가로세로 비율을 유지하면서 128x64 해상도 안에 맞춥니다.
            resized_frame = ImageOps.contain(frame.convert("RGB"), (WIDTH, HEIGHT))

            # 4. 선명도 업그레이드 (명암비 강화 필터)
            # 회색 영역을 제거하고 흑백 경계를 뚜렷하게 만들어 지글거리는 노이즈를 억제합니다.
            enhancer = ImageEnhance.Contrast(resized_frame)
            resized_frame = enhancer.enhance(4.0)  # 자글거림이 심하면 3.0 ~ 5.0 사이로 조절하세요.

            # 5. 중앙 배치를 위한 검은색 도화지(캔버스) 생성
            canvas = Image.new("1", (WIDTH, HEIGHT), 0)

            # 정중앙 좌표 계산 후 붙여넣기 (1비트 흑백 변환 적용)
            paste_x = (WIDTH - resized_frame.width) // 2
            paste_y = (HEIGHT - resized_frame.height) // 2
            canvas.paste(resized_frame.convert("1"), (paste_x, paste_y))

            # 6. OLED 화면 출력
            oled.image(canvas)
            oled.show()

            # GIF 원본 프레임 속도 유지
            duration = frame.info.get('duration', 40) / 1000.0
            time.sleep(max(duration - (time.time() - start_time), 0))

except KeyboardInterrupt:
    print("\n재생이 중단되었습니다.")

finally:
    oled.fill(0)
    oled.show()
