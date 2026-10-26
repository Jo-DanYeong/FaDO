package backend.server.RaspberryPi;

import backend.server.RaspberryPi.DTO.DetectionResponse;
import backend.server.RaspberryPi.DTO.SelectExpressionRequest;
import io.netty.channel.ChannelOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Service
public class RaspberryClient {
    private final WebClient client;

    public RaspberryClient(@Value("${Raspberry.base-url}") String baseUrl) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
                .responseTimeout(Duration.ofSeconds(60));

        this.client = WebClient.builder()
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }

    public DetectionResponse predict(byte[] imageBytes, MediaType contentType) {
        ByteArrayResource resource = new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return contentType.equals(MediaType.IMAGE_PNG) ? "upload.png" : "upload.jpg";
            }
        };

        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(contentType);

        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("file", new HttpEntity<>(resource, partHeaders));

        try {
            DetectionResponse response = client.post()
                    .uri("/predict")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .bodyValue(parts)
                    .retrieve()
                    .bodyToMono(DetectionResponse.class)
                    .block();

            if (response == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "YOLO 응답이 비어 있습니다.");
            }
            return response;
        } catch (WebClientResponseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "YOLO 추론 서버가 오류를 반환했습니다. 상태코드: " + e.getStatusCode(), e);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "YOLO 추론 서버에 연결할 수 없거나 타임아웃이 발생했습니다.", e);
        }
    }

    public String health() {
        return client.get()
                .uri("/health")
                .retrieve()
                .bodyToMono(String.class)
                .block();
    }

    public void sendExpression(SelectExpressionRequest request) {
        client.post()
                .uri("/expression")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .toBodilessEntity()
                .block();
    }

    public void uploadExpressionImage(String expressionId, String name, byte[] pngBytes) {
        ByteArrayResource resource = new ByteArrayResource(pngBytes) {
            @Override
            public String getFilename() {
                return expressionId + ".png";
            }
        };
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("expressionId", expressionId);
        parts.add("name", name);
        parts.add("file", new HttpEntity<>(resource, headers));
        try {
            client.post()
                    .uri("/expression/image")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .bodyValue(parts)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (WebClientException error) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "라파 PNG 저장에 실패했습니다.", error
            );
        }
    }
    public void deleteExpressionImage(String expressionId) {
        try {
            client.delete()
                    .uri(builder -> builder.path("/expression/image")
                            .queryParam("expressionId", expressionId).build())
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (WebClientException error) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "라파 PNG 삭제에 실패했습니다.", error
            );
        }
    }
}