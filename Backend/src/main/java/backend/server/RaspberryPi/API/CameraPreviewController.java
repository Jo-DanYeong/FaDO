package backend.server.RaspberryPi.API;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.util.Locale;
import java.util.concurrent.Semaphore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CameraPreviewController {
    private final URI upstreamStream;
    private final Semaphore viewers = new Semaphore(2);

    public CameraPreviewController(@Value("${Raspberry.base-url}") String baseUrl) {
        upstreamStream = URI.create(baseUrl).resolve("/camera/stream");
    }

    @GetMapping("/api/v1/raspberry/camera/stream")
    public void stream(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        // Forward the viewer's Basic auth. Never substitute the backend's own credentials here.
        if (authorization == null || authorization.length() > 2048
                || !authorization.matches("(?i)Basic [A-Za-z0-9+/]+={0,2}")) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        if (!viewers.tryAcquire()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            return;
        }

        HttpURLConnection upstream = null;
        try {
            upstream = (HttpURLConnection) upstreamStream.toURL().openConnection();
            upstream.setConnectTimeout(5_000);
            upstream.setReadTimeout(45_000);
            upstream.setInstanceFollowRedirects(false);
            upstream.setRequestProperty(HttpHeaders.AUTHORIZATION, authorization);
            upstream.setRequestProperty(HttpHeaders.ACCEPT, "multipart/x-mixed-replace");
            int status = upstream.getResponseCode();
            if (status != HttpServletResponse.SC_OK) {
                response.setStatus(status == 401 || status == 403
                        ? HttpServletResponse.SC_UNAUTHORIZED : HttpServletResponse.SC_BAD_GATEWAY);
                return;
            }
            String contentType = upstream.getContentType();
            if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("multipart/x-mixed-replace;")) {
                response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
                return;
            }
            response.setContentType(contentType);
            response.setHeader("X-Accel-Buffering", "no");
            try (InputStream input = upstream.getInputStream()) {
                var output = response.getOutputStream();
                byte[] chunk = new byte[8192];
                int read;
                while ((read = input.read(chunk)) != -1) {
                    output.write(chunk, 0, read);
                    output.flush();
                }
            }
        } catch (SocketTimeoutException timeout) {
            if (!response.isCommitted()) response.setStatus(HttpServletResponse.SC_GATEWAY_TIMEOUT);
        } catch (IOException disconnected) {
            if (!response.isCommitted()) response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
        } finally {
            if (upstream != null) upstream.disconnect();
            viewers.release();
        }
    }
}