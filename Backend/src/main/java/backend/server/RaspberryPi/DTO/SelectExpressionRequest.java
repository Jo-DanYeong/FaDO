package backend.server.RaspberryPi.DTO;

public record SelectExpressionRequest(String expressionId, String holdToken) {
    public SelectExpressionRequest(String expressionId) {
        this(expressionId, null);
    }
}
