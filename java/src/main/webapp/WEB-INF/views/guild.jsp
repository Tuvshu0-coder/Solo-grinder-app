<%-- Guild: create/join forms when not in a guild; otherwise leaderboard, weekly quest and invite code. --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<c:choose>
<c:when test="${empty membership}">
  <ui:pageTitle title="Guild" sub="Start a guild with friends and compete on XP every week." />
  <ui:flash />
  <c:if test="${not empty cooldownUntil}">
    <div class="dialog mb-8" role="status">You left a guild less than 7 days ago. You can join again after ${sg:fmt(cooldownUntil)}.</div>
  </c:if>
  <div class="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
    <form method="post" action="${ctx}/guild/create" class="panel grid gap-4">
      <div class="panel-head"><h2 class="m-0 text-base font-normal">New guild</h2></div>
      <div>
        <label class="label" for="g-name">Guild name</label>
        <input id="g-name" name="name" class="input" required maxlength="40">
      </div>
      <button class="btn justify-self-start" ${empty cooldownUntil ? '' : 'disabled'}>Create guild</button>
    </form>
    <form method="post" action="${ctx}/guild/join" class="panel grid gap-4">
      <div class="panel-head mint"><h2 class="m-0 text-base font-normal">Join with a code</h2></div>
      <div>
        <label class="label" for="g-code">Invite code</label>
        <input id="g-code" name="code" class="input uppercase" placeholder="e.g. 3FA9C21B" required>
      </div>
      <button class="btn justify-self-start" ${empty cooldownUntil ? '' : 'disabled'}>Join guild</button>
    </form>
  </div>
  <ul class="muted m-0 mt-8 grid list-none gap-1 p-0">
    <li>Up to ${maxMembers} members per guild.</li>
    <li>The leaderboard resets every Monday.</li>
    <li>When the guild quest is done, every active member gets +${reward} XP.</li>
  </ul>
</c:when>

<c:otherwise>
  <c:set var="isLeader" value="${membership.leader}" />
  <ui:pageTitle title="${guild.name}" sub="${guild.memberCount}/${maxMembers} members. This week started ${weekStart}." />
  <ui:flash />

  <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
    <%-- ---------- leaderboard ---------- --%>
    <section class="panel">
      <div class="panel-head">
        <h2 class="m-0 text-base font-normal">Weekly leaderboard</h2>
        <span>${totalWeekXp} XP total</span>
      </div>
      <ol class="m-0 list-none p-0">
        <c:forEach var="r" items="${board}" varStatus="s">
          <c:set var="me" value="${r.userId == user.id}" />
          <%-- placing tiles reuse the rank frames: gold, light slate, gray, then white --%>
          <c:set var="frame" value="${s.index == 0 ? 'A' : s.index == 1 ? 'D' : s.index == 2 ? 'C' : 'E'}" />
          <li class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${s.index > 0 ? 'dash-sep' : ''} ${me ? 'bg-violet-light' : ''}">
            <span class="rank sm" style="border-image-source: var(--frame-rank-${frame})" aria-label="Place ${s.count}">${s.count}</span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-x-3">
                <span class="truncate"><c:out value="${r.username}" /></span>
                <c:if test="${me}"><span class="muted">(you)</span></c:if>
                <c:if test="${r.leader}"><span class="badge badge-butter">Leader</span></c:if>
              </div>
              <div class="mt-1 flex items-center gap-3">
                <div class="min-w-0 flex-1">${sg:bar(r.weekXp, topXp)}</div>
                <span class="w-[6ch] text-right">${r.weekXp}</span>
              </div>
              <div class="muted flex flex-wrap gap-x-5">
                <span>${r.doneCount} finished</span>
                <span>${r.earlyCount} early</span>
              </div>
            </div>
            <c:if test="${isLeader and not me}">
              <div class="col-span-2 sm:col-span-1">
                <ui:dialog id="member-${r.userId}" label="Manage" title="${r.username}">
                  <form method="post" action="${ctx}/guild/transfer" class="grid gap-2">
                    <input type="hidden" name="userId" value="${r.userId}">
                    <p class="m-0">Hand leadership to <c:out value="${r.username}" />. You become a regular member.</p>
                    <button class="btn-sec justify-self-start">Make leader</button>
                  </form>
                  <form method="post" action="${ctx}/guild/kick" class="dash-sep grid gap-2 pt-4">
                    <input type="hidden" name="userId" value="${r.userId}">
                    <p class="m-0"><c:out value="${r.username}" /> will be removed from the guild.</p>
                    <button class="btn-danger justify-self-start">Remove member</button>
                  </form>
                </ui:dialog>
              </div>
            </c:if>
          </li>
        </c:forEach>
      </ol>
      <p class="muted m-0 mt-4">XP earned this week while in the guild. Guild quest bonuses don't count. Resets Monday at 00:00.</p>
    </section>

    <div class="grid grid-cols-1 gap-8">
      <%-- ---------- weekly guild quest ---------- --%>
      <section class="panel">
        <div class="panel-head mint"><h2 class="m-0 text-base font-normal">Guild quest</h2></div>
        <c:choose>
          <c:when test="${not empty quest}">
            <div class="grid gap-2">
              <div><c:out value="${quest.title}" /></div>
              <div class="flex items-center gap-3">
                <div class="min-w-0 flex-1">${sg:bar(quest.progress, quest.targetValue)}</div>
                <span class="muted">${sg:min(quest.progress, quest.targetValue)}/${quest.targetValue}</span>
                <c:if test="${quest.completed}">${sg:icon('check', 2, 'violet')}</c:if>
              </div>
              <p class="muted m-0">${quest.completed
                  ? 'Done. Members who finished a task this week got +' += reward += ' XP.'
                  : 'When it\'s done, every member who finished 1+ task this week gets +' += reward += ' XP.'}</p>
            </div>
          </c:when>
          <c:when test="${isLeader}">
            <form method="post" action="${ctx}/guild/quest" class="grid gap-4">
              <div>
                <label class="label" for="q-goal">Goal</label>
                <select id="q-goal" name="goalType" class="input">
                  <c:forEach var="g" items="${goalTypes}"><option value="${g}">${g.label}</option></c:forEach>
                </select>
              </div>
              <div>
                <label class="label" for="q-type">Task type</label>
                <select id="q-type" name="taskType" class="input">
                  <option value="">Any type</option>
                  <c:forEach var="type" items="${taskTypes}"><option value="${type}">${type.label}</option></c:forEach>
                </select>
                <p class="muted m-0 mt-1">Only used by the "Tasks of one type" goal.</p>
              </div>
              <div>
                <label class="label" for="q-target">Total (at least ${minTarget})</label>
                <input id="q-target" name="targetValue" type="number" min="${minTarget}" value="${minTarget}" class="input" required>
              </div>
              <button class="btn">Set quest</button>
            </form>
          </c:when>
          <c:otherwise><p class="muted m-0">The leader hasn't set this week's quest yet.</p></c:otherwise>
        </c:choose>
      </section>

      <%-- ---------- invite + leave ---------- --%>
      <section class="panel grid gap-4">
        <div class="panel-head mint"><h2 class="m-0 text-base font-normal">Invite code</h2></div>
        <div class="dialog select-all text-center text-3xl tracking-[0.15em]">${guild.inviteCode}</div>
        <p class="muted m-0">Send this code to friends so they can join.</p>
        <div class="dash-sep pt-4">
          <ui:dialog id="leave-guild" label="Leave guild" btn="btn-danger" title="Leave this guild?">
            <p class="m-0">After leaving, you can't join another guild for 7 days.${isLeader ? ' Leadership passes to the longest-standing member.' : ''}</p>
            <form method="post" action="${ctx}/guild/leave"><button class="btn-danger">Leave guild</button></form>
          </ui:dialog>
        </div>
      </section>
    </div>
  </div>
</c:otherwise>
</c:choose>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
