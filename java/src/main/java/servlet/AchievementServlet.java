// AchievementServlet: GET /achievements. One "ladder" per condition (streak, tasks, ...).
package servlet;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import dao.AchievementDAO;
import dao.TaskDAO;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import model.Achievement;
import model.ConditionType;
import model.PlayerStats;
import model.User;
import util.DBManager;

@WebServlet("/achievements")
public class AchievementServlet extends BaseServlet {

    /** One step on a ladder: the achievement, when it was unlocked (null = locked), and whether the trail below it is lit. */
    public static final class Tier {
        private final Achievement achievement;
        private final Instant unlockedAt;
        private final boolean nextOn;

        Tier(Achievement achievement, Instant unlockedAt, boolean nextOn) {
            this.achievement = achievement;
            this.unlockedAt = unlockedAt;
            this.nextOn = nextOn;
        }

        public Achievement getAchievement() { return achievement; }
        public Instant getUnlockedAt() { return unlockedAt; }
        public boolean isNextOn() { return nextOn; }
    }

    public static final class Ladder {
        private final String label;
        private final int current;
        private final List<Tier> tiers = new ArrayList<>();

        Ladder(String label, int current) {
            this.label = label;
            this.current = current;
        }

        public String getLabel() { return label; }
        public int getCurrent() { return current; }
        public List<Tier> getTiers() { return tiers; }
    }

    @Override
    protected void get(HttpServletRequest req, HttpServletResponse res) throws Exception {
        User user = user(req);
        DBManager.read(con -> {
            TaskDAO tasks = new TaskDAO(con);
            List<Achievement> all = new AchievementDAO(con).findAll();
            Map<Integer, Instant> unlocked = new AchievementDAO(con).unlockedBy(user.getId());
            PlayerStats stats = new PlayerStats(user.getStreak(), tasks.countDone(user.getId(), null, false),
                    tasks.countDone(user.getId(), null, true), user.getLevelId());

            List<Ladder> ladders = new ArrayList<>();
            for (ConditionType type : ConditionType.values()) {
                List<Achievement> tiers = all.stream().filter(a -> a.getConditionType() == type).toList();
                if (tiers.isEmpty()) continue;
                Ladder ladder = new Ladder(type.getLabel(), type.valueOf(stats));
                for (int i = 0; i < tiers.size(); i++) {
                    Achievement a = tiers.get(i);
                    boolean nextOn = i + 1 < tiers.size() && unlocked.containsKey(tiers.get(i + 1).getId());
                    ladder.getTiers().add(new Tier(a, unlocked.get(a.getId()), nextOn));
                }
                ladders.add(ladder);
            }
            req.setAttribute("ladders", ladders);
            req.setAttribute("unlockedCount", unlocked.size());
            req.setAttribute("total", all.size());
            return null;
        });
        render(req, res, "achievements");
    }
}
