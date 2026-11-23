// AuthService: log in, sign up and sessions.
// Passwords are stored as bcrypt hashes, never as plain text. A session is a random id kept in
// the Session table and in an HttpOnly cookie, valid for 30 days.
package service;

import java.security.SecureRandom;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

import org.mindrot.jbcrypt.BCrypt;

import dao.UserDAO;
import model.User;
import util.DBManager;

public final class AuthService {

    public static final Duration SESSION_LENGTH = Duration.ofDays(30);
    private static final SecureRandom RANDOM = new SecureRandom();

    private AuthService() {}

    /** The user, if the name and password match and the account isn't suspended. */
    public static User login(String username, String password) throws SQLException, GameException {
        User user = DBManager.read(con -> new UserDAO(con).findByUsername(username));
        if (user == null || !BCrypt.checkpw(password, user.getPasswordHash())) {
            throw new GameException("Wrong username or password."); // same message for both: harder to guess
        }
        if (user.isSuspended()) throw new GameException("Your account is suspended.");
        return user;
    }

    /** Creates a student account and returns its id. */
    public static int register(String username, String password) throws SQLException, GameException {
        if (!username.matches("[a-zA-Z0-9_]{3,20}"))
            throw new GameException("Username must be 3–20 characters (latin letters, digits, _).");
        if (password.length() < 6) throw new GameException("Password must be at least 6 characters.");
        String hash = BCrypt.hashpw(password, BCrypt.gensalt(10));
        Integer id = DBManager.transaction(con -> {
            UserDAO users = new UserDAO(con);
            if (users.findByUsername(username) != null) return null;
            return users.insert(username, hash, "STUDENT", Instant.now());
        });
        if (id == null) throw new GameException("That username is taken.");
        return id;
    }

    /** Starts a session and returns its id (to put in the cookie). */
    public static String startSession(int userId) throws SQLException {
        byte[] b = new byte[32];
        RANDOM.nextBytes(b);
        String id = HexFormat.of().formatHex(b);
        DBManager.read(con -> {
            new UserDAO(con).insertSession(id, userId, Instant.now().plus(SESSION_LENGTH));
            return null;
        });
        return id;
    }

    public static User userForSession(String sessionId) throws SQLException {
        if (sessionId == null || sessionId.isEmpty()) return null;
        return DBManager.read(con -> new UserDAO(con).findBySession(sessionId, Instant.now()));
    }

    public static void endSession(String sessionId) throws SQLException {
        if (sessionId == null) return;
        DBManager.read(con -> {
            new UserDAO(con).deleteSession(sessionId);
            return null;
        });
    }
}
