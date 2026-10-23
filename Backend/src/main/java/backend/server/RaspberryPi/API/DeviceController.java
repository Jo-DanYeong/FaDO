package backend.server.RaspberryPi.API;

import backend.server.RaspberryPi.DTO.SelectExpressionRequest;
import backend.server.RaspberryPi.RaspberryClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class DeviceController {

    private final RaspberryClient client;

    public DeviceController(RaspberryClient client){
        this.client = client;
    }

    @PostMapping("/expression")
    public ResponseEntity<String> receiveExpression(@RequestBody SelectExpressionRequest request) {
        String id = request.expressionId();
        System.out.println("받은 id : " + id);
        client.sendExpression(request);

        return ResponseEntity.ok("성공");
    }
}