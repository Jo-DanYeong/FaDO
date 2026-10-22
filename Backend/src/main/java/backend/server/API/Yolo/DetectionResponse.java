package backend.server.API.Yolo;

import java.util.List;

public record DetectionResponse(List<Detection> detections) {
    public record Detection(String className, double confidence, List<Double> box) {}
}