package backend.server.health.DTO;

import java.time.Instant;

public record HealthDTO(String AppName, String status, Instant instant) {
}
