// All day and week boundaries use Mongolia time (UTC+8, no daylight saving), rule 5.
// A "day key" is the date as text, "2026-11-23", which is what the database stores for quests.
package util;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;

public final class MnTime {

    public static final ZoneOffset MN = ZoneOffset.ofHours(8);
    public static final Duration HOUR = Duration.ofHours(1);
    public static final Duration DAY = Duration.ofDays(1);

    private static final DateTimeFormatter DISPLAY = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter INPUT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private MnTime() {}

    /** YYYY-MM-DD of the instant in Mongolia time. */
    public static String dayKey(Instant i) {
        return LocalDate.ofInstant(i, MN).toString();
    }

    /** The instant of 00:00 Mongolia time on that day. */
    public static Instant dayStart(String key) {
        return LocalDate.parse(key).atStartOfDay().toInstant(MN);
    }

    public static String addDays(String key, int n) {
        return LocalDate.parse(key).plusDays(n).toString();
    }

    /** Day key of the Monday that starts the week containing the instant. */
    public static String weekStartKey(Instant i) {
        return LocalDate.ofInstant(i, MN).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString();
    }

    /** "2026-11-23 14:05" in Mongolia time, or "—" for no date. */
    public static String fmt(Instant i) {
        return i == null ? "—" : LocalDateTime.ofInstant(i, MN).format(DISPLAY);
    }

    /** Value for <input type="datetime-local">, in Mongolia time. */
    public static String toLocalInput(Instant i) {
        return LocalDateTime.ofInstant(i, MN).format(INPUT);
    }

    /** Reads an <input type="datetime-local"> value as Mongolia time; null if it is not a valid date. */
    public static Instant fromLocalInput(String v) {
        try {
            return LocalDateTime.parse(v, INPUT).toInstant(MN);
        } catch (DateTimeParseException | NullPointerException e) {
            return null;
        }
    }
}
