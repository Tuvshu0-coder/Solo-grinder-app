// DashboardServlet: the home page "/" (player HUD, what's due, today's quests, XP chart, history).
package servlet;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import dao.LevelDAO;
import dao.QuestDAO;
import dao.TaskDAO;
import dao.XpLogDAO;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import model.Level;
import model.User;
import model.XpLog;
import util.DBManager;
import util.MnTime;
import util.Rules;

@WebServlet("") // "" = exactly the site root
public class DashboardServlet extends BaseServlet {

    private static final int CHART_H = 160; // px; a multiple of 4 so bar heights land on whole art pixels

    /** One day of the 14-day XP chart. */
    public static final class ChartDay {
        private final String key;
        private final int xp;
        private final int height;
        private final boolean today;

        ChartDay(String key, int xp, int height, boolean today) {
            this.key = key;
            this.xp = xp;
            this.height = height;
            this.today = today;
        }

        public String getKey() { return key; }
        public String getLabel() { return key.substring(8); } // day of month
        public int getXp() { return xp; }
        public int getHeight() { return height; }
        public boolean isToday() { return today; }
    }

    @Override
    protected void get(HttpServletRequest req, HttpServletResponse res) throws Exception {
        User user = user(req);
        Instant now = Instant.now();
        String today = MnTime.dayKey(now);
        String fromDay = MnTime.addDays(today, -13);

        DBManager.read(con -> {
            LevelDAO levels = new LevelDAO(con);
            TaskDAO tasks = new TaskDAO(con);
            XpLogDAO xp = new XpLogDAO(con);

            Level current = levels.find(user.getLevelId());
            Level next = levels.find(user.getLevelId() + 1);
            int floor = current == null ? 0 : current.getMinXp();
            int ceil = next == null ? floor : next.getMinXp();
            req.setAttribute("nextLevel", next);
            req.setAttribute("levelXp", user.getTotalXp() - floor);
            req.setAttribute("levelSpan", ceil - floor);
            req.setAttribute("toNext", ceil - user.getTotalXp());

            int todayXp = xp.sumSince(user.getId(), MnTime.dayStart(today));
            req.setAttribute("todayXp", todayXp);
            req.setAttribute("nearCap", todayXp >= Rules.DAILY_XP_CAP * 0.9);
            req.setAttribute("quests", new QuestDAO(con).findDaily(user.getId(), today, false));
            req.setAttribute("upcoming", tasks.findOpen(user.getId(), 5));
            req.setAttribute("recent", xp.recent(user.getId(), 6));

            // Finish timing: early (> x1), on time (x1), late (< x1).
            int early = 0, onTime = 0, late = 0;
            List<Double> mults = tasks.doneMultipliers(user.getId());
            for (Double m : mults) {
                if (m != null && m > 1) early++;
                else if (m != null && m == 1) onTime++;
                else if (m != null && m < 1) late++;
            }
            req.setAttribute("doneCount", mults.size());
            req.setAttribute("early", early);
            req.setAttribute("onTime", onTime);
            req.setAttribute("late", late);

            // XP per day for the chart.
            Map<String, Integer> perDay = new HashMap<>();
            for (XpLog l : xp.findSince(user.getId(), MnTime.dayStart(fromDay))) {
                perDay.merge(MnTime.dayKey(l.getCreatedAt()), l.getXpAmount(), Integer::sum);
            }
            int maxDay = Math.max(Rules.DAILY_XP_CAP / 2, perDay.values().stream().mapToInt(Integer::intValue).max().orElse(0));
            List<ChartDay> chart = new ArrayList<>();
            for (int i = 0; i < 14; i++) {
                String d = MnTime.addDays(fromDay, i);
                int v = perDay.getOrDefault(d, 0);
                int h = (int) Math.round((double) v / maxDay * CHART_H / 4) * 4;
                chart.add(new ChartDay(d, v, h, d.equals(today)));
            }
            req.setAttribute("chart", chart);
            return null;
        });
        req.setAttribute("today", today);
        req.setAttribute("cap", Rules.DAILY_XP_CAP);
        render(req, res, "dashboard");
    }
}
