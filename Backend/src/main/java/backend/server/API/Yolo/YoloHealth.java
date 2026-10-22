package backend.server.API.Yolo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/health")
public class YoloHealth {
    private final YoloClient yoloClient;

    public YoloHealth(YoloClient yoloClient) {
        this.yoloClient = yoloClient;
    }

    @GetMapping
    public String health() {
        return yoloClient.health();
    }
}
