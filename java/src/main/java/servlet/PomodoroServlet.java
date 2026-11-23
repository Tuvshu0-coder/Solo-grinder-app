// PomodoroServlet: GET /pomodoro. The timer itself runs in the browser (webapp/js/pomodoro.js).
package servlet;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet("/pomodoro")
public class PomodoroServlet extends BaseServlet {

    @Override
    protected void get(HttpServletRequest req, HttpServletResponse res) throws Exception {
        render(req, res, "pomodoro");
    }
}
