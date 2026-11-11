package backend.server.RaspberryPi.DTO;

import org.springframework.http.HttpStatusCode;

public record RaspberryHealthDTO(String deviceName, HttpStatusCode statusCode, String status) {
}
