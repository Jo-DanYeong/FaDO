package backend.server.health;

import java.time.Instant;

public record HealthDTO(String AppName, String status, Instant instant) {
}
