// AuthServlet: /login, /register (GET = form, POST = do it) and /logout (POST).
package servlet;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import model.User;
import service.AuthService;
import service.GameException;

@WebServlet({"/login", "/register", "/logout"})
public class AuthServlet extends BaseServlet {

    @Override
    protected void get(HttpServletRequest req, HttpServletResponse res) throws Exception {
        if (req.getServletPath().equals("/logout")) {
            go(req, res, "/login");
            return;
        }
        User current = AuthService.userForSession(AuthFilter.sessionId(req));
        if (current != null) { // already logged in
            go(req, res, current.isAdmin() ? "/admin" : "/");
            return;
        }
        req.setAttribute("mode", req.getServletPath().substring(1)); // "login" or "register"
        render(req, res, "auth");
    }

    @Override
    protected void post(HttpServletRequest req, HttpServletResponse res) throws Exception {
        String path = req.getServletPath();
        if (path.equals("/logout")) {
            AuthService.endSession(AuthFilter.sessionId(req));
            clearSessionCookie(req, res);
            go(req, res, "/login");
            return;
        }

        String username = str(req, "username");
        String password = str(req, "password");
        try {
            if (path.equals("/login")) {
                User user = AuthService.login(username, password);
                setSessionCookie(req, res, AuthService.startSession(user.getId()));
                go(req, res, user.isAdmin() ? "/admin" : "/");
            } else {
                int id = AuthService.register(username, password);
                setSessionCookie(req, res, AuthService.startSession(id));
                go(req, res, "/subjects?msg=" + URLEncoder.encode("Welcome! Start by adding your subjects.", StandardCharsets.UTF_8));
            }
        } catch (GameException e) {
            back(req, res, path, "err", e.getMessage());
        }
    }
}
