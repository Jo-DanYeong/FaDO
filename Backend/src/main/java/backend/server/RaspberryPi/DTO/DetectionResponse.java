package backend.server.RaspberryPi.DTO;

import java.util.List;

public record DetectionResponse(List<Detection> detections) {
    public record Detection(String className, double confidence, List<Double> box) {}
}