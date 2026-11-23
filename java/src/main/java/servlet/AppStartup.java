// AppStartup: Tomcat calls this once when the site starts. It makes sure the database has its
// tables and starting data (service.DbSetup), so a fresh copy of the project just works.
package servlet;

import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import service.DbSetup;

@WebListener
public class AppStartup implements ServletContextListener {

    @Override
    public void contextInitialized(ServletContextEvent event) {
        try {
            DbSetup.ensure();
        } catch (Exception e) {
            throw new IllegalStateException("Could not prepare the database", e);
        }
    }
}
