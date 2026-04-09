package com.kintai.pdf;

import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.BaseFont;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * OpenPDF 기본 Helvetica(CP1252)는 한글·일본어 글리프가 없어 PDF에서 빈 칸·괄호만 보입니다.
 * <p>
 * 나눔고딕은 일본어 한자(勤怠·社員·総勤務 등)가 빠져 헤더가 비는 경우가 많아,
 * 일본어 포함 정적 TTF(M+ 1p)를 우선 임베드하고, 실패 시 나눔고딕으로 폴백합니다.
 */
public final class PdfFontSupport {

    private static final Logger log = LoggerFactory.getLogger(PdfFontSupport.class);

    private static final List<FontCandidate> CANDIDATES = List.of(
            new FontCandidate("/fonts/MPLUS1p-Regular.ttf", "MPLUS1p-Regular.ttf"),
            new FontCandidate("/fonts/NanumGothic-Regular.ttf", "NanumGothic-Regular.ttf"));

    private static volatile BaseFont unicodeBase;

    private PdfFontSupport() {}

    private record FontCandidate(String resourcePath, String factoryName) {}

    public static BaseFont getUnicodeBaseFont() {
        BaseFont bf = unicodeBase;
        if (bf != null) {
            return bf;
        }
        synchronized (PdfFontSupport.class) {
            if (unicodeBase != null) {
                return unicodeBase;
            }
            List<String> tried = new ArrayList<>();
            for (FontCandidate c : CANDIDATES) {
                tried.add(c.resourcePath());
                try (InputStream in = PdfFontSupport.class.getResourceAsStream(c.resourcePath())) {
                    if (in == null) {
                        log.warn("PDF font not on classpath: {} (Gradle/Eclipse 에서 src/main/resources 가 출력에 복사되는지 확인)", c.resourcePath());
                        continue;
                    }
                    byte[] bytes = in.readAllBytes();
                    unicodeBase = BaseFont.createFont(
                            c.factoryName(),
                            BaseFont.IDENTITY_H,
                            BaseFont.EMBEDDED,
                            true,
                            bytes,
                            null);
                    log.info("PDF unicode font loaded: {}", c.resourcePath());
                    return unicodeBase;
                } catch (DocumentException | IOException e) {
                    log.warn("PDF font load failed {}: {}", c.resourcePath(), e.getMessage());
                }
            }
            log.error("No embedded CJK font worked (tried {}). PDF Japanese/Korean labels will be missing.", tried);
            try {
                unicodeBase = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            } catch (DocumentException | IOException ex) {
                throw new IllegalStateException(ex);
            }
            return unicodeBase;
        }
    }

    public static Font font(float size, int style) {
        return new Font(getUnicodeBaseFont(), size, style);
    }
}
