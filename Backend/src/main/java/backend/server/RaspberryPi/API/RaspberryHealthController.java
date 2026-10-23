package backend.server.RaspberryPi.API;

import backend.server.RaspberryPi.RaspberryClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/raspberry")
public class RaspberryHealthController {
    private final RaspberryClient raspberryClient;

    public RaspberryHealthController(RaspberryClient raspberryClient) {
        this.raspberryClient = raspberryClient;
    }

    @GetMapping("/health")
    public String health() {
        return raspberryClient.health();
    }
}
