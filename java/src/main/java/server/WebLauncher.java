// WebLauncher: starts Tomcat 11 from IntelliJ (same idea as Lesson 10's launcher).
// Right-click -> Run 'WebLauncher.main()', then open http://localhost:8080/
// Stop it with the red square button in IntelliJ.
//
// This main() only STARTS Tomcat. After that Tomcat calls the servlets' doGet/doPost itself.
// The working directory must be this "java" folder (IntelliJ's default when you open it).
package server;

import java.io.File;

import org.apache.catalina.Context;
import org.apache.catalina.WebResourceRoot;
import org.apache.catalina.startup.Tomcat;
import org.apache.catalina.webresources.DirResourceSet;
import org.apache.catalina.webresources.StandardRoot;

public class WebLauncher {

    private static final int PORT = Integer.getInteger("port", 8080);

    public static void main(String[] args) throws Exception {
        Tomcat tomcat = new Tomcat();
        tomcat.setPort(PORT);
        tomcat.setBaseDir(new File("target/tomcat").getAbsolutePath()); // Tomcat's work files
        tomcat.getConnector(); // creates the HTTP connector on PORT

        // src/main/webapp = the web folder: css, fonts, images, js and WEB-INF (JSP pages).
        // Context path "" = the site lives at the root: http://localhost:8080/
        File webappDir = new File("src/main/webapp");
        Context context = tomcat.addWebapp("", webappDir.getAbsolutePath());

        // Show our compiled classes to Tomcat as WEB-INF/classes so it finds the @WebServlet classes.
        WebResourceRoot resources = new StandardRoot(context);
        resources.addPreResources(new DirResourceSet(resources, "/WEB-INF/classes",
                new File("target/classes").getAbsolutePath(), "/"));
        context.setResources(resources);

        tomcat.start();
        System.out.println("Solo Grinding: http://localhost:" + PORT + "/   (admin / admin123)");
        tomcat.getServer().await(); // keep running until you stop it
    }
}
