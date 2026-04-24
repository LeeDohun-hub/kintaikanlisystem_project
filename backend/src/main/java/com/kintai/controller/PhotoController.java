package com.kintai.controller;

import com.kintai.auth.AdminOnly;
import com.kintai.dto.LoginResponse;
import com.kintai.entity.Employee;
import com.kintai.repository.EmployeeRepository;
import com.kintai.session.LoginSessionSupport;
import com.kintai.web.ApiResponses;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class PhotoController {

    private final EmployeeRepository employeeRepository;

    @Value("${app.photo.upload-dir:./uploads/photo}")
    private String uploadDir;

    private static final Set<String> ALLOWED_TYPES =
            Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
    private static final long MAX_SIZE = 5L * 1024 * 1024; // 5 MB

    /** 管理者が社員の写真をアップロードする */
    @AdminOnly
    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPhoto(
            @PathVariable("id") long id,
            @RequestParam("file") MultipartFile file,
            HttpSession session) {

        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return doUpload(id, file);
    }

    /** ログイン中のユーザーが自分の写真をアップロードする（管理者不要） */
    @PostMapping(value = "/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadMyPhoto(
            @RequestParam("file") MultipartFile file,
            HttpSession session) {

        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();

        return doUpload(user.getId(), file);
    }

    /** 本人がアップロードした写真を削除し、デフォルトアイコン表示に戻す */
    @DeleteMapping("/me/photo")
    public ResponseEntity<?> deleteMyPhoto(HttpSession session) {
        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();
        return doDeletePhoto(user.getId());
    }

    private ResponseEntity<?> doUpload(long id, MultipartFile file) {
        if (file.isEmpty()) return ApiResponses.badRequest("ファイルを選択してください。");
        if (file.getSize() > MAX_SIZE) return ApiResponses.badRequest("ファイルサイズは5MB以下にしてください。");

        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        if (!ALLOWED_TYPES.contains(contentType)) {
            return ApiResponses.badRequest("JPEG・PNG・GIF・WebP のみアップロードできます。");
        }

        Employee employee = employeeRepository.findById(id).orElse(null);
        if (employee == null) return ApiResponses.badRequest("従業員が見つかりません。");

        String ext = switch (contentType) {
            case "image/png"  -> "png";
            case "image/gif"  -> "gif";
            case "image/webp" -> "webp";
            default           -> "jpg";
        };

        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);

            if (employee.getPhotoFilename() != null) {
                Files.deleteIfExists(dir.resolve(employee.getPhotoFilename()));
            }

            String filename = id + "." + ext;
            Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

            employee.setPhotoFilename(filename);
            employeeRepository.save(employee);

            return ApiResponses.message("写真をアップロードしました。");
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(java.util.Map.of("error", "ファイルの保存に失敗しました。"));
        }
    }

    private ResponseEntity<?> doDeletePhoto(long id) {
        Employee employee = employeeRepository.findById(id).orElse(null);
        if (employee == null) {
            return ApiResponses.badRequest("従業員が見つかりません。");
        }
        String fn = employee.getPhotoFilename();
        if (fn == null || fn.isBlank()) {
            return ApiResponses.message("すでにデフォルト表示です。");
        }
        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.deleteIfExists(dir.resolve(fn));
        } catch (IOException ignored) {
            // DB 上はクリアする
        }
        employee.setPhotoFilename(null);
        employeeRepository.save(employee);
        return ApiResponses.message("写真をデフォルト表示に戻しました。");
    }

    /** ログイン中のユーザーであれば誰でも写真を取得できる */
    @GetMapping("/{id}/photo")
    public ResponseEntity<?> getPhoto(
            @PathVariable("id") long id,
            HttpSession session) {

        LoginResponse user = LoginSessionSupport.requireAuthenticatedUser(session);
        if (user == null) return ApiResponses.unauthorized();

        Employee employee = employeeRepository.findById(id).orElse(null);
        if (employee == null || employee.getPhotoFilename() == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path file = Paths.get(uploadDir).resolve(employee.getPhotoFilename());
            if (!Files.exists(file)) return ResponseEntity.notFound().build();

            String contentType = Files.probeContentType(file);
            if (contentType == null) contentType = "image/jpeg";

            Resource resource = new FileSystemResource(file);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
