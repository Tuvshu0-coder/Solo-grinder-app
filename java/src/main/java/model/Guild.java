// Guild = a group of up to 30 students who compete on weekly XP.
package model;

public class Guild {
    private final int id;
    private final String name;
    private final String inviteCode;
    private final int memberCount;

    public Guild(int id, String name, String inviteCode, int memberCount) {
        this.id = id;
        this.name = name;
        this.inviteCode = inviteCode;
        this.memberCount = memberCount;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getInviteCode() { return inviteCode; }
    public int getMemberCount() { return memberCount; }
}
