// One row of XP history: how much, from where, when.
package model;

import java.time.Instant;

public class XpLog {
    private final int id;
    private final XpSource source;
    private final int xpAmount;
    private final Instant createdAt;

    public XpLog(int id, XpSource source, int xpAmount, Instant createdAt) {
        this.id = id;
        this.source = source;
        this.xpAmount = xpAmount;
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public XpSource getSource() { return source; }
    public int getXpAmount() { return xpAmount; }
    public Instant getCreatedAt() { return createdAt; }
}
