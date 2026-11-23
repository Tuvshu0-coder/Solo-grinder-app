// A rule was broken by what the user tried to do (wrong password, task already done, ...).
// The message is shown to the user as-is, so it must be plain, friendly English.
package service;

public class GameException extends Exception {
    public GameException(String message) {
        super(message);
    }
}
