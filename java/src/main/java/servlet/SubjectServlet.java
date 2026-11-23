// SubjectServlet: GET /subjects, POST /subjects (add), /subjects/rename, /subjects/delete.
package servlet;

import dao.SubjectDAO;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import util.DBManager;

@WebServlet({"/subjects", "/subjects/rename", "/subjects/delete"})
public class SubjectServlet extends BaseServlet {

    @Override
    protected void get(HttpServletRequest req, HttpServletResponse res) throws Exception {
        if (!req.getServletPath().equals("/subjects")) {
            go(req, res, "/subjects");
            return;
        }
        int userId = user(req).getId();
        req.setAttribute("subjects", DBManager.read(con -> new SubjectDAO(con).findByUser(userId)));
        render(req, res, "subjects");
    }

    @Override
    protected void post(HttpServletRequest req, HttpServletResponse res) throws Exception {
        int userId = user(req).getId();
        String path = req.getServletPath();
        String name = str(req, "name");
        int id = num(req, "id");

        if (path.equals("/subjects/delete")) {
            DBManager.read(con -> {
                new SubjectDAO(con).delete(id, userId);
                return null;
            });
            back(req, res, "/subjects", "msg", "Subject deleted. XP you earned stays.");
            return;
        }
        if (name.isEmpty() || name.length() > 60) {
            back(req, res, "/subjects", "err", "Subject name must be 1–60 characters.");
            return;
        }
        boolean rename = path.equals("/subjects/rename");
        DBManager.read(con -> {
            SubjectDAO subjects = new SubjectDAO(con);
            if (rename) subjects.rename(id, userId, name);
            else subjects.insert(userId, name);
            return null;
        });
        back(req, res, "/subjects", "msg", rename ? "Subject renamed." : "Added subject \"" + name + "\".");
    }
}
