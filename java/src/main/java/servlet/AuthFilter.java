// AuthFilter: runs before EVERY request (a Servlet Filter). It is the door of the site:
//  - the login/sign-up pages and static files (css, fonts, images, js) are open to everyone
//  - every other page needs a valid login cookie, else -> /login
//  - /admin pages are for admins only; student pages for students only
// It also runs the daily maintenance (late tasks, broken streaks) and hands out today's quests,
// then puts the up-to-date user on the request for the servlet and the JSP: ${user.username}.
package servlet;

import java.io.IOException;
import java.sql.SQLException;
import java.time.Instant;

import dao.UserDAO;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import model.User;
import service.AuthService;
import service.GameService;
import util.DBManager;

@WebFilter("/*")
public class AuthFilter implements Filter {

    static final String COOKIE = "sg_session"; // same cookie name as the original app

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;
        req.setCharacterEncoding("UTF-8"); // before any form field is read

        String path = req.getServletPath() + (req.getPathInfo() == null ? "" : req.getPathInfo());
        if (isPublic(path)) {
            chain.doFilter(req, res);
            return;
        }

        try {
            User user = AuthService.userForSession(sessionId(req));
            if (user == null) {
                res.sendRedirect(req.getContextPath() + "/login");
                return;
            }
            Instant now = Instant.now();
            DBManager.read(con -> {
                new GameService(con).runMaintenance(now);
                return null;
            });

            boolean adminArea = path.equals("/admin") || path.startsWith("/admin/");
            if (adminArea != user.isAdmin()) {
                res.sendRedirect(req.getContextPath() + (user.isAdmin() ? "/admin" : "/"));
                return;
            }
            if (!user.isAdmin()) {
                int id = user.getId();
                user = DBManager.transaction(con -> {
                    new GameService(con).ensureDailyQuests(id, now);
                    return new UserDAO(con).findById(id); // fresh: maintenance may have reset the streak
                });
            }
            req.setAttribute("user", user);
        } catch (SQLException e) {
            throw new ServletException(e);
        }
        chain.doFilter(req, res);
    }

    private static boolean isPublic(String path) {
        return path.equals("/login") || path.equals("/register") || path.equals("/logout") || path.equals("/favicon.ico")
                || path.startsWith("/css/") || path.startsWith("/fonts/") || path.startsWith("/scene/") || path.startsWith("/js/");
    }

    static String sessionId(HttpServletRequest req) {
        if (req.getCookies() == null) return null;
        for (Cookie c : req.getCookies()) {
            if (COOKIE.equals(c.getName())) return c.getValue();
        }
        return null;
    }
}
