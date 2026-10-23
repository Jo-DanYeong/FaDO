package backend.server.health;

import backend.server.health.DTO.HealthDTO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/health")
public class HealthController {
    @GetMapping
    public HealthDTO health(){
        return new HealthDTO("FaDO","UP",Instant.now());
    }
}
