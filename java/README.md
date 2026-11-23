# Solo Grinding (Java web version)

The same site as the Next.js version, rebuilt with **Java Servlets + JSP + JDBC**, the stack from
Lesson 10. It uses the same database file, so every account, task and XP point carries over.

## Run it (IntelliJ)

1. **File > Open** this `java` folder. IntelliJ reads `pom.xml` and downloads the libraries.
2. Open `src/main/java/server/WebLauncher.java`, right-click it, choose **Run 'WebLauncher.main()'**.
3. Open <http://localhost:8080/>. Admin login: **admin / admin123**.

The database is `../prisma/dev.db` (shared with the Next.js app). To use another file, add
`-Dsg.db=path/to/file.db` to the run configuration's VM options. An empty or missing file is
created and filled with levels, quests, achievements and the admin account on first start.

Tests: right-click `src/test/java`, **Run 'All Tests'** (or `mvn test`). 19 tests cover the game
rules and run the engine end-to-end against a throwaway database.

## How it is organised (MVC)

```
Browser -> AuthFilter -> Servlet (controller) -> Service (game rules) -> DAO (SQL) -> SQLite
                            |  request.setAttribute(...)
                            +-> forward -> JSP (view) -> HTML
```

| Package / folder | Role |
|---|---|
| `model` | Plain classes, one per table row (`User`, `Task`, `Guild` ...), and enums (`TaskType`, `GoalType` ...) |
| `dao` | All SQL. `BaseDAO` is the parent with the shared helpers; one DAO per table group |
| `service` | Game rules that need several DAOs: `GameService` (XP, quests, streaks, achievements, levels), `GuildService`, `AuthService`, `DbSetup` |
| `servlet` | Controllers. `BaseServlet` is the parent of all of them; `AuthFilter` checks the login on every request |
| `util` | `DBManager` (connection + transactions), `Rules` (the rules as pure functions), `MnTime` (Mongolia time) |
| `web` | Helpers the JSPs call as `${sg:...}`: pixel-art sprites, progress bars, dates |
| `src/main/webapp/WEB-INF/views` | JSP pages; `tags/` holds reusable pieces (page title, dialog, message box ...) |

## Where the OOP is

- **Abstract class + polymorphism:** `model.QuestGoal` with `CompleteNGoal`, `CompleteEarlyGoal`,
  `CompleteTypeGoal`, `ClearOverdueGoal`. `GameService` asks `goal.counts(completion)` for daily and
  guild quests alike, with no `if/else` on the goal type (see the comment at the top of `QuestGoal`).
- **Enum with a method per constant:** `model.ConditionType.valueOf(stats)` for achievements.
- **Inheritance:** every DAO extends `BaseDAO`; every servlet extends `BaseServlet`, which uses the
  template-method pattern (`doGet` calls the child's `get`).
- **Encapsulation:** model fields are private and set once in the constructor.

## Security

Passwords are bcrypt hashes. The login is a random session id in an HttpOnly, SameSite=Lax cookie
(also blocks forms posted from other sites). All SQL uses `PreparedStatement`. All user text in
JSPs goes through `<c:out>`, so names like `<script>` are shown, not run.

## Generated files (don't edit by hand)

| File | Made by |
|---|---|
| `src/main/java/web/SpriteData.java` | `python -P design/build-app-assets.py` (from the repository root) |
| `src/main/webapp/scene/*.png` | `python -P design/build-login-scene.py` |
| `src/main/webapp/css/app.css` | `npm run css:java`, from `css-src/app.css`. Run it after adding new CSS classes to a JSP |
