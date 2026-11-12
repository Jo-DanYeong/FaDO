import argparse
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw


def show_test_pattern(driver):
    width, height = driver.WIDTH, driver.HEIGHT
    with Image.new("1", (width, height)) as image, BytesIO() as png:
        draw = ImageDraw.Draw(image)
        draw.rectangle((0, 0, width - 1, height - 1), outline=255)
        draw.rectangle((4, 4, 10, 10), fill=255)
        draw.text((width // 2, height // 2), "FaDO OLED TEST", fill=255, anchor="mm")
        image.save(png, format="PNG")
        png.seek(0)
        driver.show_image(png)


def main():
    parser = argparse.ArgumentParser(description="FaDO의 SSD1306 SPI OLED에 테스트 이미지를 표시합니다.")
    parser.add_argument("image", nargs="?", type=Path, help="표시할 이미지 경로. 생략하면 테스트 패턴을 표시합니다.")
    args = parser.parse_args()

    if args.image is not None and not args.image.is_file():
        parser.error(f"이미지 파일을 찾을 수 없습니다: {args.image}")

    try:
        if __package__:
            from . import ImgShow
        else:
            import ImgShow

        if args.image is None:
            show_test_pattern(ImgShow)
        else:
            ImgShow.show_image(args.image)
    except (ImportError, OSError, RuntimeError, ValueError, AttributeError) as error:
        parser.exit(1, f"OLED 테스트 실패 ({type(error).__name__}): {error}\n")

    print("OLED에 이미지를 전송했습니다. 실제 화면에 표시되는지 확인하세요.")


if __name__ == "__main__":
    main()
