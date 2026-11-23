// Rules: the game's rules as pure functions (section 8 of the requirements). No database here,
// so every rule is unit-tested in src/test/java/util/RulesTest.java.
package util;

import java.time.Duration;
import java.time.Instant;

import model.Task;
import model.TaskStatus;

public final class Rules {

    public static final int BASE_XP = 50;                                  // rule 6
    public static final int DAILY_XP_CAP = 400;                            // rule 9
    public static final Duration EARLY_BONUS_MIN_OPEN = Duration.ofHours(24); // rule 7
    public static final int EARLY_BONUS_PER_DAY = 3;                       // rule 8
    public static final Duration DEADLINE_MIN = Duration.ofHours(3);       // rule 3
    public static final Duration DEADLINE_MAX = Duration.ofDays(30);       // rule 3
    public static final Duration DEADLINE_EDIT_MIN_LEFT = Duration.ofHours(24); // rule 4
    public static final int GUILD_MAX_MEMBERS = 30;                        // rule 15
    public static final Duration GUILD_COOLDOWN = Duration.ofDays(7);      // rule 16
    public static final int GUILD_QUEST_PER_MEMBER = 3;                    // rule 18
    public static final int GUILD_QUEST_REWARD = 50;                       // rule 19
    public static final int DAILY_QUEST_COUNT = 3;                         // rule 11

    private Rules() {}

    /** XP multiplier for finishing a task at `now` (section 8 table, plus rules 4, 7, 8). */
    public static double multiplier(Instant createdAt, Instant deadline, boolean deadlineEdited,
                                    Instant now, int earlyBonusesUsedToday) {
        if (now.isAfter(deadline)) {
            return Duration.between(deadline, now).compareTo(MnTime.DAY) <= 0 ? 0.5 : 0.2;
        }
        long total = Duration.between(createdAt, deadline).toMillis();
        double fracLeft = total > 0 ? (double) Duration.between(now, deadline).toMillis() / total : 0;
        double m = fracLeft > 0.5 ? 1.5 : fracLeft >= 0.2 ? 1.2 : 1.0;

        if (m > 1) {
            if (Duration.between(createdAt, now).compareTo(EARLY_BONUS_MIN_OPEN) < 0) m = 1.0; // rule 7
            else if (deadlineEdited) m = 1.0;                                                 // rule 4
            else if (earlyBonusesUsedToday >= EARLY_BONUS_PER_DAY) m = 1.0;                   // rule 8
        }
        return m;
    }

    public static int xpFor(double multiplier) {
        return (int) Math.round(BASE_XP * multiplier);
    }

    /** How much of `amount` still fits under today's cap (rule 9). */
    public static int capXp(int amount, int alreadyToday) {
        return Math.max(0, Math.min(amount, DAILY_XP_CAP - alreadyToday));
    }

    /** Default total XP needed for a level: 20 x L^2 (level 1 = 0), rule 21. */
    public static int defaultMinXp(int level) {
        return level <= 1 ? 0 : 20 * level * level;
    }

    public static String rankForLevel(int level) {
        if (level >= 50) return "S";
        if (level >= 40) return "A";
        if (level >= 30) return "B";
        if (level >= 20) return "C";
        if (level >= 10) return "D";
        return "E";
    }

    /** Rule 3: an error message for a bad new deadline, or null if it is fine. */
    public static String validateDeadline(Instant deadline, Instant from) {
        if (deadline == null) return "Invalid deadline.";
        Duration diff = Duration.between(from, deadline);
        if (diff.compareTo(DEADLINE_MIN) < 0) return "The deadline must be at least 3 hours from now.";
        if (diff.compareTo(DEADLINE_MAX) > 0) return "The deadline must be at most 30 days from now.";
        return null;
    }

    /** Rule 4: why this task's deadline can't be edited now, or null if it can. */
    public static String deadlineEditBlock(Task t, Instant now) {
        if (t.getStatus() == TaskStatus.DONE) return "A finished task's deadline can't be changed.";
        if (t.isDeadlineEdited()) return "The deadline can be changed only once.";
        if (Duration.between(now, t.getDeadline()).compareTo(DEADLINE_EDIT_MIN_LEFT) < 0)
            return "Less than 24 hours are left, so the deadline can't be changed.";
        return null;
    }

    /** Rule 12: the streak after finishing a task on time today. */
    public static int nextStreak(int streak, String lastActiveDate, String today, String yesterday) {
        if (today.equals(lastActiveDate)) return streak;
        if (yesterday.equals(lastActiveDate)) return streak + 1;
        return 1;
    }

    /** Rule 18: the smallest allowed guild quest target. */
    public static int minGuildQuestTarget(int memberCount) {
        return Math.max(1, memberCount) * GUILD_QUEST_PER_MEMBER;
    }

    public static String multiplierLabel(Double m) {
        if (m == null) return "—";
        if (m >= 1.5) return "Very early ×1.5";
        if (m >= 1.2) return "Early ×1.2";
        if (m >= 1.0) return "On time ×1.0";
        if (m >= 0.5) return "A bit late ×0.5";
        return "Very late ×0.2";
    }
}
