package backend.server.RaspberryPi.API;

import backend.server.RaspberryPi.DTO.ExpressionImageResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;

@RestController
@RequestMapping("/api/v1/expression")
public class ExpressionImageController {
    private final Path storageDirectory = Path.of("uploads", "expressions")
            .toAbsolutePath().normalize();


    @PostMapping(value = "/image",consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExpressionImageResponse> uploadImage(@RequestParam("expressionId") String expressionId,
                                                               @RequestParam("name") String name, @RequestPart("file")
                                                                     MultipartFile file) throws IOException {
        // 서버 저장 경로에는 클라이언트가 보낸 파일명을 사용하지 않습니다.
        if (!expressionId.matches("[a-zA-Z0-9-]{1,100}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바르지 않은 표정 ID입니다.");
        }
        if (name.isBlank() || name.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "표정 이름을 확인해주세요.");
        }
        if (file.isEmpty() || file.getSize() > 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "1MB 이하의 PNG 파일이 필요합니다.");
        }

        BufferedImage image;
        try (InputStream stream = file.getInputStream();
             ImageInputStream input = ImageIO.createImageInputStream(stream)) {
            if (input == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지를 읽을 수 없습니다.");
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지 파일이 아닙니다.");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input);
                if (!"png".equalsIgnoreCase(reader.getFormatName())
                        || reader.getWidth(0) != 128 || reader.getHeight(0) != 64) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "128 x 64 PNG만 업로드할 수 있습니다.");
                }
                image = reader.read(0);
            } finally {
                reader.dispose();
            }
        }

        Files.createDirectories(storageDirectory);
        String filename = expressionId + ".png";
        Path target = storageDirectory.resolve(filename);
        if (!ImageIO.write(image, "png", target.toFile())) {
            throw new IOException("PNG 파일을 저장하지 못했습니다.");
        }

        return ResponseEntity.ok(new ExpressionImageResponse(
                expressionId, name.trim(), filename, 128, 64
        ));
    }

    @DeleteMapping("/image")
    public ResponseEntity<Void> deleteImage(
            @RequestParam("expressionId") String expressionId
    ) throws IOException {
        if (!expressionId.matches("[a-zA-Z0-9-]{1,100}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바르지 않은 표정 ID입니다.");
        }
        Path target = storageDirectory.resolve(expressionId + ".png").normalize();
        if (!target.getParent().equals(storageDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바르지 않은 파일 경로입니다.");
        }
        if (Files.isDirectory(target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "잘못된 경로요청");
        }
        Files.deleteIfExists(target);
        return ResponseEntity.noContent().build();
    }
}
