package backend.server.RaspberryPi.API;

import backend.server.RaspberryPi.DTO.DetectionResponse;
import backend.server.RaspberryPi.RaspberryClient;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Set;

@RestController
@RequestMapping("/api/v1")
public class DetectionController {
    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png");
    private final RaspberryClient raspberryClient;

    public DetectionController(RaspberryClient raspberryClient) {
        this.raspberryClient = raspberryClient;
    }

    @PostMapping(value = "/detect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DetectionResponse detect(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지가 비어 있습니다.");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "최대 10MB까지 업로드할 수 있습니다.");
        }
        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "JPG와 PNG만 지원합니다.");
        }
        return raspberryClient.predict(file.getBytes(), MediaType.parseMediaType(file.getContentType()));
    }
}
