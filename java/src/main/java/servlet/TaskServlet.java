// TaskServlet: the Tasks page and its actions.
//   GET  /tasks?f=open|done|all   list, grouped by urgency
//   POST /tasks                   add a task
//   POST /tasks/complete          finish a task (the game engine runs here)
//   POST /tasks/deadline          change the deadline once
//   POST /tasks/delete            delete an unfinished task
package servlet;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import dao.SubjectDAO;
import dao.TaskDAO;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import model.CompleteResult;
import model.Task;
import model.TaskStatus;
import model.TaskType;
import model.User;
import service.GameException;
import service.GameService;
import util.DBManager;
import util.MnTime;
import util.Rules;

@WebServlet({"/tasks", "/tasks/complete", "/tasks/deadline", "/tasks/delete"})
public class TaskServlet extends BaseServlet {

    private static final Set<String> FILTERS = Set.of("open", "done", "all");

    /** One urgency group on the page: Late, Due within 24h, Later, Done. */
    public static final class TaskGroup {
        private final String title;
        private final String head; // panel-head colour class
        private final List<Task> tasks = new ArrayList<>();

        TaskGroup(String title, String head) {
            this.title = title;
            this.head = head;
        }

        public String getTitle() { return title; }
        public String getHead() { return head; }
        public List<Task> getTasks() { return tasks; }
    }

    @Override
    protected void get(HttpServletRequest req, HttpServletResponse res) throws Exception {
        if (!req.getServletPath().equals("/tasks")) {
            go(req, res, "/tasks");
            return;
        }
        User user = user(req);
        String f = FILTERS.contains(str(req, "f")) ? str(req, "f") : "open";
        Instant now = Instant.now();

        DBManager.read(con -> {
            TaskDAO tasks = new TaskDAO(con);
            req.setAttribute("subjects", new SubjectDAO(con).findByUser(user.getId()));
            Map<TaskStatus, Integer> counts = tasks.countByStatus(user.getId());
            int open = counts.get(TaskStatus.TODO) + counts.get(TaskStatus.LATE);
            req.setAttribute("tabs", List.of(
                    new String[] {"open", "To do", String.valueOf(open)},
                    new String[] {"done", "Done", String.valueOf(counts.get(TaskStatus.DONE))},
                    new String[] {"all", "All", String.valueOf(open + counts.get(TaskStatus.DONE))}));

            TaskGroup late = new TaskGroup("Late", "rose");
            TaskGroup soon = new TaskGroup("Due within 24h", "");
            TaskGroup later = new TaskGroup("Later", "mint");
            TaskGroup done = new TaskGroup("Done", "mint");
            Map<Integer, String> editBlock = new HashMap<>(); // task id -> why its deadline can't change
            List<Task> list = tasks.findForList(user.getId(), f);
            for (Task t : list) {
                if (t.isDone()) {
                    done.getTasks().add(t);
                    continue;
                }
                Duration left = Duration.between(now, t.getDeadline());
                if (t.getStatus() == TaskStatus.LATE || left.isNegative()) late.getTasks().add(t);
                else if (left.compareTo(MnTime.DAY) < 0) soon.getTasks().add(t);
                else later.getTasks().add(t);
                String block = Rules.deadlineEditBlock(t, now);
                if (block != null) editBlock.put(t.getId(), block);
            }
            List<TaskGroup> groups = new ArrayList<>();
            for (TaskGroup g : List.of(late, soon, later, done)) if (!g.getTasks().isEmpty()) groups.add(g);
            req.setAttribute("groups", groups);
            req.setAttribute("taskCount", list.size());
            req.setAttribute("editBlock", editBlock);
            return null;
        });

        req.setAttribute("f", f);
        req.setAttribute("taskTypes", TaskType.values());
        req.setAttribute("minDl", MnTime.toLocalInput(now.plus(Rules.DEADLINE_MIN)));
        req.setAttribute("maxDl", MnTime.toLocalInput(now.plus(Rules.DEADLINE_MAX)));
        req.setAttribute("defDl", MnTime.toLocalInput(now.plus(Duration.ofDays(3))));
        req.setAttribute("returnTo", "/tasks?f=" + f);
        render(req, res, "tasks");
    }

    @Override
    protected void post(HttpServletRequest req, HttpServletResponse res) throws Exception {
        switch (req.getServletPath()) {
            case "/tasks" -> create(req, res);
            case "/tasks/complete" -> complete(req, res);
            case "/tasks/deadline" -> changeDeadline(req, res);
            default -> delete(req, res);
        }
    }

    private void create(HttpServletRequest req, HttpServletResponse res) throws Exception {
        int userId = user(req).getId();
        int subjectId = num(req, "subjectId");
        String title = str(req, "title");
        TaskType type = TaskType.parse(str(req, "type"));
        Instant deadline = MnTime.fromLocalInput(str(req, "deadline"));
        Instant now = Instant.now();

        if (!DBManager.read(con -> new SubjectDAO(con).isOwnedBy(subjectId, userId))) {
            back(req, res, "/tasks", "err", "Every task must belong to a subject."); // rule 2
            return;
        }
        String err = type == null ? "Choose a task type."
                : title.isEmpty() || title.length() > 120 ? "Task name must be 1–120 characters."
                : Rules.validateDeadline(deadline, now); // rule 3
        if (err != null) {
            back(req, res, "/tasks", "err", err);
            return;
        }
        DBManager.read(con -> {
            new TaskDAO(con).insert(subjectId, title, type, deadline, now);
            return null;
        });
        back(req, res, "/tasks", "msg", "Added task \"" + title + "\".");
    }

    private void complete(HttpServletRequest req, HttpServletResponse res) throws Exception {
        int userId = user(req).getId();
        int taskId = num(req, "id");
        String returnTo = str(req, "returnTo");
        // Only our own pages: a path on this site, never "//other-site" or a full URL.
        if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.contains("\\")) returnTo = "/tasks";

        CompleteResult r;
        try {
            r = DBManager.transaction(con -> {
                try {
                    return new GameService(con).completeTask(userId, taskId, Instant.now());
                } catch (GameException e) {
                    throw new RuleBroken(e);
                }
            });
        } catch (RuleBroken e) {
            back(req, res, returnTo, "err", e.getCause().getMessage());
            return;
        }

        List<String> parts = new ArrayList<>();
        parts.add("+" + r.getGranted() + " XP (" + Rules.multiplierLabel(r.getMultiplier()) + ")");
        if (r.getGranted() < r.getBaseXp())
            parts.add("daily 400 XP cap reached, " + (r.getBaseXp() - r.getGranted()) + " XP cut");
        if (!r.getQuestsCompleted().isEmpty()) parts.add("Quests done: " + String.join(", ", r.getQuestsCompleted()));
        if (!r.getAchievementsUnlocked().isEmpty())
            parts.add("Achievement: " + String.join(", ", r.getAchievementsUnlocked()));
        if (r.getLeveledUpTo() != null) parts.add("LEVEL UP → " + r.getLeveledUpTo() + "!");
        if (r.isGuildQuestCompleted()) parts.add("Guild quest done! +" + Rules.GUILD_QUEST_REWARD + " XP");
        back(req, res, returnTo, "msg", String.join(" · ", parts));
    }

    private void changeDeadline(HttpServletRequest req, HttpServletResponse res) throws Exception {
        int userId = user(req).getId();
        int taskId = num(req, "id");
        Instant now = Instant.now();
        Task task = DBManager.read(con -> new TaskDAO(con).findOwned(taskId, userId));
        if (task == null) {
            back(req, res, "/tasks", "err", "Task not found.");
            return;
        }
        Instant deadline = MnTime.fromLocalInput(str(req, "deadline"));
        String err = Rules.deadlineEditBlock(task, now); // rule 4
        if (err == null) err = Rules.validateDeadline(deadline, now);
        if (err != null) {
            back(req, res, "/tasks", "err", err);
            return;
        }
        DBManager.read(con -> {
            new TaskDAO(con).changeDeadline(task.getId(), deadline);
            return null;
        });
        back(req, res, "/tasks", "msg", "Deadline changed. This task now earns at most ×1.0.");
    }

    private void delete(HttpServletRequest req, HttpServletResponse res) throws Exception {
        int userId = user(req).getId();
        int taskId = num(req, "id");
        DBManager.read(con -> {
            new TaskDAO(con).deleteOpen(taskId, userId);
            return null;
        });
        back(req, res, "/tasks", "msg", "Task deleted.");
    }

    /** Carries a GameException out of the transaction lambda, so the transaction rolls back. */
    private static final class RuleBroken extends RuntimeException {
        RuleBroken(GameException cause) {
            super(cause);
        }
    }
}
