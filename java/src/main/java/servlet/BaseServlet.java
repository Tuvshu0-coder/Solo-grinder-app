// BaseServlet: the parent of every servlet (INHERITANCE + the "template method" pattern).
//
// doGet/doPost are written once here: they call get(...) / post(...), which each child servlet
// overrides, and turn database errors into a 500 page. Children also share the helpers below
// for reading form fields, showing a JSP and redirecting with a message.
//
// After a POST we always REDIRECT (never show a page directly), with the result in the URL:
// /tasks?msg=Task+deleted. The page shows it in its message box. Refreshing never repeats the action.
package servlet;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import model.User;
import service.AuthService;

public abstract class BaseServlet extends HttpServlet {

    @Override
    protected final void doGet(HttpServletRequest req, HttpServletResponse res) throws ServletException, IOException {
        handle(() -> get(req, res));
    }

    @Override
    protected final void doPost(HttpServletRequest req, HttpServletResponse res) throws ServletException, IOException {
        handle(() -> post(req, res));
    }

    /** Override to answer GET. */
    protected void get(HttpServletRequest req, HttpServletResponse res) throws Exception {
        res.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
    }

    /** Override to answer POST. */
    protected void post(HttpServletRequest req, HttpServletResponse res) throws Exception {
        res.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
    }

    private interface Action {
        void run() throws Exception;
    }

    private static void handle(Action action) throws ServletException, IOException {
        try {
            action.run();
        } catch (ServletException | IOException | RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new ServletException(e); // e.g. SQLException -> error page
        }
    }

    // ---------- helpers for the child servlets ----------

    /** The logged-in user (put on the request by AuthFilter). */
    protected static User user(HttpServletRequest req) {
        return (User) req.getAttribute("user");
    }

    /** Shows /WEB-INF/views/{view}.jsp. The view name also tells the sidebar which link is active. */
    protected static void render(HttpServletRequest req, HttpServletResponse res, String view)
            throws ServletException, IOException {
        req.setAttribute("view", view);
        req.getRequestDispatcher("/WEB-INF/views/" + view + ".jsp").forward(req, res);
    }

    /** Redirect to path with ?msg=... (kind "msg") or ?err=... (kind "err"). */
    protected static void back(HttpServletRequest req, HttpServletResponse res, String path, String kind, String text)
            throws IOException {
        String sep = path.contains("?") ? "&" : "?";
        res.sendRedirect(req.getContextPath() + path + sep + kind + "=" + URLEncoder.encode(text, StandardCharsets.UTF_8));
    }

    protected static void go(HttpServletRequest req, HttpServletResponse res, String path) throws IOException {
        res.sendRedirect(req.getContextPath() + path);
    }

    /** A form field, trimmed; "" if missing. */
    protected static String str(HttpServletRequest req, String name) {
        String v = req.getParameter(name);
        return v == null ? "" : v.trim();
    }

    /** A whole-number form field, or Integer.MIN_VALUE if it is missing or not a number (fails every range check). */
    protected static int num(HttpServletRequest req, String name) {
        try {
            return Integer.parseInt(str(req, name));
        } catch (NumberFormatException e) {
            return Integer.MIN_VALUE;
        }
    }

    // ---------- login cookie ----------

    protected static void setSessionCookie(HttpServletRequest req, HttpServletResponse res, String sessionId) {
        res.addCookie(sessionCookie(req, sessionId, (int) AuthService.SESSION_LENGTH.toSeconds()));
    }

    protected static void clearSessionCookie(HttpServletRequest req, HttpServletResponse res) {
        res.addCookie(sessionCookie(req, "", 0));
    }

    private static Cookie sessionCookie(HttpServletRequest req, String value, int maxAge) {
        Cookie c = new Cookie(AuthFilter.COOKIE, value);
        c.setHttpOnly(true);                 // JavaScript can't read it
        c.setSecure(req.isSecure());         // HTTPS-only when the site runs on HTTPS
        c.setAttribute("SameSite", "Lax");   // not sent with forms posted from other sites (blocks CSRF)
        c.setPath(req.getContextPath().isEmpty() ? "/" : req.getContextPath());
        c.setMaxAge(maxAge);
        return c;
    }
}
