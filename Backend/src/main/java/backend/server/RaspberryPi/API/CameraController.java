package backend.server.RaspberryPi.API;

import backend.server.RaspberryPi.DTO.DetectionResponse;
import io.netty.channel.ChannelOption;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import reactor.netty.http.client.HttpClient;

@RestController
@RequestMapping("/api/v1/raspberry/camera")
public class CameraController {
    private final WebClient cameraClient;
    private final boolean credentialsConfigured;

    public CameraController(
            @Value("${Raspberry.base-url}") String baseUrl,
            @Value("${Raspberry.camera-user}") String username,
            @Value("${Raspberry.camera-password}") String password) {
        credentialsConfigured = !username.isBlank() && !password.isBlank();
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
                .responseTimeout(Duration.ofSeconds(35));
        WebClient.Builder builder = WebClient.builder()
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient));
        if (credentialsConfigured) {
            builder.defaultHeaders(headers ->
                    headers.setBasicAuth(username, password, StandardCharsets.UTF_8));
        }
        cameraClient = builder.build();
    }

    @PostMapping("/detect")
    public DetectionResponse detect() {
        if (!credentialsConfigured) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "라파 카메라 인증 정보가 백엔드에 설정되지 않았습니다.");
        }
        try {
            DetectionResponse result = cameraClient.post()
                    .uri("/camera/detect")
                    .retrieve()
                    .bodyToMono(DetectionResponse.class)
                    .block(Duration.ofSeconds(40));
            if (result == null || result.detections() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "라파 카메라의 인식 응답이 비어 있습니다.");
            }
            return result;
        } catch (WebClientResponseException error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "라파 카메라 인식 실패: " + error.getStatusCode().value(), error);
        } catch (ResponseStatusException error) {
            throw error;
        } catch (RuntimeException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "라파 카메라에 연결할 수 없거나 응답 시간이 초과됐습니다.", error);
        }
    }
}
