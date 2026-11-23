// Unit tests for the pure rules (same cases as the original src/lib/rules.test.ts).
package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.Duration;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import model.Task;
import model.TaskStatus;
import model.TaskType;

class RulesTest {

    static final Instant T0 = Instant.parse("2026-11-01T00:00:00Z");
    static final Duration HOUR = Duration.ofHours(1);
    static final Duration DAY = Duration.ofDays(1);

    static Instant at(Duration d) {
        return T0.plus(d);
    }

    static double m(Duration deadline, Duration now, boolean edited, int earlyUsed) {
        return Rules.multiplier(T0, at(deadline), edited, at(now), earlyUsed);
    }

    static Task task(Instant deadline, boolean edited) {
        return new Task(1, 1, "S", "t", TaskType.HOMEWORK, deadline, T0, null, TaskStatus.TODO, null, 0, edited);
    }

    @Test
    void specExampleTenDayDeadlineDoneOnDayThree() {
        assertEquals(1.5, m(DAY.multipliedBy(10), DAY.multipliedBy(3), false, 0));
    }

    @Test
    void twentyToFiftyPercentLeftIsX12AndLessIsX10() {
        assertEquals(1.2, m(DAY.multipliedBy(10), DAY.multipliedBy(6), false, 0));
        assertEquals(1.0, m(DAY.multipliedBy(10), DAY.multipliedBy(9), false, 0));
    }

    @Test
    void lateWithin24hIsX05AndBeyondIsX02() {
        assertEquals(0.5, m(DAY, DAY.plus(HOUR.multipliedBy(2)), false, 0));
        assertEquals(0.2, m(DAY, DAY.multipliedBy(3), false, 0));
    }

    @Test
    void rule7OpenLessThan24hGetsNoEarlyBonus() {
        assertEquals(1.0, m(DAY.multipliedBy(30), Duration.ofMinutes(31), false, 0));
        assertEquals(1.0, m(DAY.multipliedBy(30), HOUR.multipliedBy(23), false, 0));
        assertEquals(1.5, m(DAY.multipliedBy(30), HOUR.multipliedBy(25), false, 0));
    }

    @Test
    void rule8FourthEarlyTaskOfTheDayIsX10() {
        assertEquals(1.0, m(DAY.multipliedBy(10), DAY.multipliedBy(2), false, 3));
    }

    @Test
    void rule4EditedDeadlineCapsAtX10ButLatePenaltyStays() {
        assertEquals(1.0, m(DAY.multipliedBy(10), DAY.multipliedBy(2), true, 0));
        assertEquals(0.2, m(DAY, DAY.multipliedBy(3), true, 0));
    }

    @Test
    void rule9DailyCap() {
        assertEquals(20, Rules.capXp(75, 380));
        assertEquals(0, Rules.capXp(75, 400));
        assertEquals(50, Rules.capXp(50, 0));
    }

    @Test
    void rules3And4DeadlineValidationAndEditWindow() {
        assertNotNull(Rules.validateDeadline(at(HOUR.multipliedBy(2)), T0));
        assertNull(Rules.validateDeadline(at(HOUR.multipliedBy(3)), T0));
        assertNotNull(Rules.validateDeadline(at(DAY.multipliedBy(31)), T0));
        assertNotNull(Rules.validateDeadline(null, T0));
        Task t = task(at(DAY.multipliedBy(2)), false);
        assertNull(Rules.deadlineEditBlock(t, T0));
        assertNotNull(Rules.deadlineEditBlock(t, at(DAY.plus(HOUR))));
        assertNotNull(Rules.deadlineEditBlock(task(at(DAY.multipliedBy(2)), true), T0));
    }

    @Test
    void rule12Streak() {
        assertEquals(5, Rules.nextStreak(4, "2026-11-06", "2026-11-07", "2026-11-06"));
        assertEquals(4, Rules.nextStreak(4, "2026-11-07", "2026-11-07", "2026-11-06"));
        assertEquals(1, Rules.nextStreak(4, "2026-11-04", "2026-11-07", "2026-11-06"));
        assertEquals(1, Rules.nextStreak(0, null, "2026-11-07", "2026-11-06"));
    }

    @Test
    void rule21LevelCurve() {
        assertEquals(0, Rules.defaultMinXp(1));
        assertEquals(2000, Rules.defaultMinXp(10));
        assertEquals(50000, Rules.defaultMinXp(50));
    }

    @Test
    void mongoliaTimeBoundaries() {
        assertEquals("2026-11-07", MnTime.dayKey(Instant.parse("2026-11-07T15:59:00Z")));
        assertEquals("2026-11-08", MnTime.dayKey(Instant.parse("2026-11-07T16:00:00Z"))); // 00:00 UTC+8
        assertEquals("2026-11-02", MnTime.weekStartKey(Instant.parse("2026-11-07T12:00:00Z"))); // Sat -> Mon
        assertEquals("2026-11-09", MnTime.weekStartKey(Instant.parse("2026-11-08T17:00:00Z"))); // Mon 01:00 MN
        assertEquals("2026-11-07 23:59", MnTime.fmt(Instant.parse("2026-11-07T15:59:00Z")));
        assertEquals(Instant.parse("2026-11-07T16:00:00Z"), MnTime.fromLocalInput("2026-11-08T00:00"));
        assertNull(MnTime.fromLocalInput("not a date"));
    }
}
