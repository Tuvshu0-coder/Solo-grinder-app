// DBManager: the ONE place that knows where the database is and how to connect.
//
// Unlike Lesson 10, DAOs do not open their own connection: a DAO receives a Connection in its
// constructor. That lets one action (e.g. finishing a task: XP + quests + achievements + level)
// run several DAOs inside ONE transaction, so it is all saved or none of it is.
package util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import org.sqlite.SQLiteConfig;

public final class DBManager {

    // The SQLite file. Default = the original app's database, so accounts and progress carry over.
    // shortcut: path is relative to the "java" folder; move it next to this project once the TypeScript app is removed.
    private static volatile String path = System.getProperty("sg.db", "../prisma/dev.db");

    private DBManager() {}

    /** Tests point the app at a throwaway database file. */
    public static void usePath(String newPath) {
        path = newPath;
    }

    public static Connection getConnection() throws SQLException {
        SQLiteConfig config = new SQLiteConfig();
        config.enforceForeignKeys(true);   // ON DELETE CASCADE only works with this on
        config.setBusyTimeout(5000);       // wait for another writer instead of failing at once
        // A transaction takes the write lock when it starts, so two requests can never both
        // "check, then insert" at the same time (this fixes the duplicate daily quests).
        config.setTransactionMode(SQLiteConfig.TransactionMode.IMMEDIATE);
        return DriverManager.getConnection("jdbc:sqlite:" + path, config.toProperties());
    }

    /** A piece of work that uses one connection. */
    @FunctionalInterface
    public interface Work<T> {
        T run(Connection con) throws SQLException;
    }

    /** Runs read-only or single-statement work on a fresh connection. */
    public static <T> T read(Work<T> work) throws SQLException {
        try (Connection con = getConnection()) {
            return work.run(con);
        }
    }

    /** Runs work inside one transaction: commit if it finishes, roll back if anything throws. */
    public static <T> T transaction(Work<T> work) throws SQLException {
        try (Connection con = getConnection()) {
            con.setAutoCommit(false);
            try {
                T result = work.run(con);
                con.commit();
                return result;
            } catch (SQLException | RuntimeException e) {
                con.rollback();
                throw e;
            }
        }
    }
}
