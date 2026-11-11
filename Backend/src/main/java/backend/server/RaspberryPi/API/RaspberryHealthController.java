package backend.server.RaspberryPi.API;

import backend.server.RaspberryPi.DTO.RaspberryHealthDTO;
import backend.server.RaspberryPi.RaspberryClient;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("api/v1/raspberry")
public class RaspberryHealthController {
    private final RaspberryClient raspberryClient;

    public RaspberryHealthController(RaspberryClient raspberryClient) {
        this.raspberryClient = raspberryClient;
    }

    @GetMapping("/health")
    public RaspberryHealthDTO health() {
        try{
            RaspberryHealthDTO healthDto = new RaspberryHealthDTO("RaspberryPi", HttpStatus.OK, raspberryClient.health());
            return ResponseEntity.ok(healthDto).getBody();
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new RaspberryHealthDTO("RaspberryPi", e.getStatusCode(),", 라즈베리파이 서버 연결 실패")).getBody();
        }
    }
}
