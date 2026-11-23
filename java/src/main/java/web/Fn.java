// Fn: small view helpers the JSP pages call as ${sg:name(...)} (declared in WEB-INF/sg.tld).
// The HTML ones only ever build markup from numbers and fixed names, never from user text,
// so their output is safe to print without escaping.
package web;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;

import model.Task;
import util.MnTime;
import util.Rules;

public final class Fn {

    private Fn() {}

    // ---------- pixel art ----------

    /** name = check | cursor | flame | lock | medal. color = a palette token ("white", "violet", ...) or "" for the default. */
    public static String icon(String name, int scale, String color) {
        String c = color == null || color.isEmpty() ? null : SpriteData.COLORS.get(color);
        return switch (name) {
            case "flame" -> Sprites.svg(SpriteData.ICON_FLAME, SpriteData.FLAME_PALETTE, scale, "", null, "");
            case "medal" -> Sprites.svg(SpriteData.ICON_MEDAL, SpriteData.MEDAL_PALETTE, scale, "", null, "");
            case "lock" -> Sprites.svg(SpriteData.ICON_LOCK,
                    c == null ? SpriteData.LOCK_PALETTE : Map.of('o', SpriteData.COLORS.get("ink"), 'y', c), scale, "", null, "");
            case "check" -> Sprites.svg(SpriteData.ICON_CHECK, Map.of('#', c != null ? c : SpriteData.COLORS.get("white")), scale, "", null, "");
            default -> Sprites.svg(SpriteData.ICON_CURSOR, Map.of('#', c != null ? c : SpriteData.COLORS.get("violet")), scale, "", null, "");
        };
    }

    /** The player's character with its ground shadow; bob = the 1px idle animation. */
    public static String hero(int scale, boolean bob) {
        String[] hero = SpriteData.HERO;
        String size = "width:" + hero[0].length() * scale + "px;height:" + hero.length * scale + "px;--px-step:" + scale + "px";
        String shadow = Sprites.svg(SpriteData.HERO_SHADOW, Map.of('x', SpriteData.COLORS.get("line")), scale,
                "hero-shadow", null, "top:" + SpriteData.HERO_SHADOW_TOP * scale + "px");
        String body = Sprites.svg(hero, SpriteData.HERO_PALETTE, scale, bob ? "hero-sprite" : "", "Your character", "");
        return "<span class=\"hero\" style=\"" + size + "\">" + shadow + body + "</span>";
    }

    // ---------- progress ----------

    /** Discrete progress: [■■■··]. blocks <= 0 means one block per step. tone = "violet" | "butter". */
    public static String seg(int value, int max, int blocks, String tone) {
        int n = Math.max(1, blocks > 0 ? blocks : max);
        int filled = max > 0 ? (int) Math.round((double) Math.min(value, max) / max * n) : 0;
        StringBuilder sb = new StringBuilder("<span class=\"seg").append("butter".equals(tone) ? " butter" : "")
                .append("\" role=\"img\" aria-label=\"").append(Math.min(value, max)).append('/').append(max).append("\">[");
        for (int i = 0; i < n; i++) sb.append(i < filled ? "<b></b>" : "<b class=\"off\"></b>");
        return sb.append("]</span>").toString();
    }

    /** Continuous progress bar with tick marks. */
    public static String bar(int value, int max) {
        double pct = max > 0 ? Math.min(100, Math.max(0, (double) value / max * 100)) : 0;
        return "<div class=\"track\" role=\"progressbar\" aria-valuenow=\"" + value + "\" aria-valuemin=\"0\" aria-valuemax=\""
                + max + "\"><i style=\"width:" + String.format(Locale.US, "%.2f", pct) + "%\"></i></div>";
    }

    /** Rank letter tile (E ... S). */
    public static String rank(String rank, boolean big) {
        String r = SpriteData.RANK_TEXT.containsKey(rank) ? rank : "E"; // only the 6 known letters ever reach the HTML
        return "<span class=\"rank" + (big ? "" : " sm") + "\" style=\"border-image-source: var(--frame-rank-" + r
                + "); color: " + SpriteData.RANK_TEXT.get(r) + "\" title=\"Rank " + r + "\">" + r + "</span>";
    }

    // ---------- text ----------

    public static String fmt(Instant i) {
        return MnTime.fmt(i);
    }

    /** "2026-11-23" */
    public static String day(Instant i) {
        return i == null ? "—" : MnTime.fmt(i).substring(0, 10);
    }

    /** "11-23" */
    public static String monthDay(Instant i) {
        return i == null ? "—" : MnTime.fmt(i).substring(5, 10);
    }

    public static String localInput(Instant i) {
        return MnTime.toLocalInput(i);
    }

    /** 1275 -> "1,275" */
    public static String num(long n) {
        return String.format(Locale.US, "%,d", n);
    }

    /** 2 -> "002" */
    public static String pad3(int n) {
        return String.format("%03d", n);
    }

    public static int min(int a, int b) {
        return Math.min(a, b);
    }

    public static String multiplier(Double m) {
        return Rules.multiplierLabel(m);
    }

    /** "2d 5h left" / "3h late". */
    public static String timeLeft(Task t) {
        Duration left = Duration.between(Instant.now(), t.getDeadline());
        Duration abs = left.abs();
        long d = abs.toDays();
        long h = abs.minusDays(d).toHours();
        String span = d > 0 ? d + "d " + h + "h" : h + "h";
        return span + (left.isNegative() ? " late" : " left");
    }

    /** CSS class for timeLeft: red when late, amber under 24h. */
    public static String timeTone(Task t) {
        Duration left = Duration.between(Instant.now(), t.getDeadline());
        if (left.isNegative()) return "text-rose-dark";
        return left.compareTo(MnTime.DAY) < 0 ? "text-butter-dark" : "muted";
    }
}
