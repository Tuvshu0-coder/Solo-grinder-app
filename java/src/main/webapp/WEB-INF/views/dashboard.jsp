<%-- Dashboard "/": player HUD, what's due, today's quests, finish timing, 14-day XP chart, XP history. --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<ui:flash />

<%-- ---------- player HUD: the one dark block on the page ---------- --%>
<section class="hud mb-10 grid grid-cols-1 items-end gap-x-10 gap-y-5 sm:grid-cols-[auto_minmax(0,1fr)]" aria-label="Player">
  <div class="justify-self-center sm:justify-self-start">${sg:hero(2, true)}</div>
  <div class="min-w-0">
    <div class="flex flex-wrap items-baseline justify-between gap-x-6">
      <h1 class="m-0 truncate text-3xl font-normal"><c:out value="${user.username}" /></h1>
      <span class="muted">Player No.${sg:pad3(user.id)}</span>
    </div>
    <dl class="mt-4 mb-5 grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4">
      <div class="min-w-0"><dt class="muted">Level</dt><dd class="m-0 flex min-h-[44px] items-center text-xl">${user.levelId}</dd></div>
      <div class="min-w-0"><dt class="muted">Rank</dt><dd class="m-0 flex min-h-[44px] items-center text-xl">${sg:rank(user.rank, false)}</dd></div>
      <div class="min-w-0"><dt class="muted">Total XP</dt><dd class="m-0 flex min-h-[44px] items-center text-xl">${sg:num(user.totalXp)}</dd></div>
      <div class="min-w-0"><dt class="muted">Streak</dt>
        <dd class="m-0 flex min-h-[44px] items-center text-xl"><span class="flex items-center gap-3">${sg:icon('flame', 3, '')}${user.streak} days</span></dd></div>
    </dl>
    <div class="flex flex-wrap justify-between gap-x-4">
      <span>Level ${user.levelId} → ${empty nextLevel ? 'MAX' : nextLevel.id}</span>
      <span class="muted">${empty nextLevel ? 'Max level' : sg:num(toNext) += ' XP to go'}</span>
    </div>
    ${sg:bar(levelXp, levelSpan)}
  </div>
</section>

<%-- two independent columns on desktop; below lg the wrappers dissolve (display: contents) so "order" sets one reading order --%>
<div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
  <div class="contents lg:flex lg:flex-col lg:gap-8">
    <%-- ---------- what is due ---------- --%>
    <section class="panel order-1 lg:order-none">
      <div class="panel-head">
        <h2 class="m-0 text-base font-normal">Up next</h2>
        <a href="${ctx}/tasks" class="flex shrink-0 items-center gap-2">All ${sg:icon('cursor', 2, 'white')}</a>
      </div>
      <c:choose>
        <c:when test="${empty upcoming}">
          <div class="flex flex-wrap items-center justify-between gap-4 py-2">
            <p class="m-0">Nothing due. Add a task and start earning XP.</p>
            <a href="${ctx}/tasks" class="btn">Add a task</a>
          </div>
        </c:when>
        <c:otherwise>
          <ul class="m-0 list-none p-0">
            <c:forEach var="t" items="${upcoming}" varStatus="s">
              <li class="grid grid-cols-1 items-center gap-x-5 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] ${s.index > 0 ? 'dash-sep' : ''}">
                <ui:taskSummary task="${t}" compact="true" />
                <ui:completeButton id="${t.id}" returnTo="/" />
              </li>
            </c:forEach>
          </ul>
        </c:otherwise>
      </c:choose>
    </section>

    <%-- ---------- xp chart ---------- --%>
    <section class="panel order-4 lg:order-none">
      <div class="panel-head mint">
        <h2 class="m-0 text-base font-normal">XP, last 14 days</h2>
        <span class="muted">up to ${cap} a day</span>
      </div>
      <div class="flex items-end gap-[6px]" style="height: 160px">
        <c:forEach var="d" items="${chart}">
          <div class="flex h-full flex-1 items-end" title="${d.key}: ${d.xp} XP">
            <span class="block w-full" style="height: ${d.height}px; background: ${d.today ? 'var(--butter)' : 'var(--violet)'};${d.height > 0 ? ' box-shadow: inset 0 0 0 2px var(--ink)' : ''}"></span>
          </div>
        </c:forEach>
      </div>
      <div class="dash-days mt-1 flex gap-[6px]">
        <c:forEach var="d" items="${chart}"><span class="muted min-w-0 flex-1 text-center">${d.label}</span></c:forEach>
      </div>
    </section>
  </div>

  <div class="contents lg:flex lg:flex-col lg:gap-8">
    <%-- ---------- today ---------- --%>
    <section class="panel order-2 lg:order-none">
      <div class="panel-head">
        <h2 class="m-0 text-base font-normal">Today</h2>
        <span>${today.substring(5)}</span>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-x-4">
        <span>Daily XP</span>
        <span class="${nearCap ? 'text-butter-dark' : ''}">${todayXp}/${cap}</span>
      </div>
      ${sg:seg(todayXp, cap, 16, nearCap ? 'butter' : 'violet')}
      <c:if test="${nearCap}"><p class="m-0 text-butter-dark">Almost at the cap. XP past it won't count.</p></c:if>

      <h3 class="card-title mt-6">Daily quest</h3>
      <c:if test="${empty quests}"><p class="muted m-0">No quests today.</p></c:if>
      <ul class="m-0 grid list-none gap-4 p-0">
        <c:forEach var="q" items="${quests}">
          <li>
            <div class="${q.completed ? 'muted line-through' : ''}"><c:out value="${q.template.title}" /></div>
            <div class="flex items-center gap-3">
              ${sg:seg(q.progress, q.template.targetValue, 0, 'violet')}
              <span class="muted">${sg:min(q.progress, q.template.targetValue)}/${q.template.targetValue}</span>
              <c:if test="${q.completed}">${sg:icon('check', 2, 'violet')}</c:if>
              <span class="badge ml-auto ${q.completed ? 'badge-violet' : 'badge-vl'}">+${q.template.xpReward} XP</span>
            </div>
          </li>
        </c:forEach>
      </ul>
    </section>

    <%-- ---------- finish timing ---------- --%>
    <section class="panel order-3 lg:order-none">
      <div class="panel-head mint">
        <h2 class="m-0 text-base font-normal">Finished tasks</h2>
        <span class="muted">${doneCount}</span>
      </div>
      <div class="flex items-center justify-between gap-3 py-1"><span>Early (×1.2+)</span><span class="badge badge-violet">${early}</span></div>
      <div class="flex items-center justify-between gap-3 py-1"><span>On time</span><span class="badge badge-mint">${onTime}</span></div>
      <div class="flex items-center justify-between gap-3 py-1"><span>Late</span><span class="badge badge-rose">${late}</span></div>
      <div class="track mt-4 flex" aria-hidden="true">
        <c:if test="${doneCount > 0}">
          <span class="block h-full" style="width: ${early / doneCount * 100}%; background: var(--violet)"></span>
          <span class="block h-full" style="width: ${onTime / doneCount * 100}%; background: var(--mint-dark)"></span>
          <span class="block h-full" style="width: ${late / doneCount * 100}%; background: var(--rose)"></span>
        </c:if>
      </div>
    </section>

    <%-- ---------- recent xp ---------- --%>
    <section class="panel order-5 lg:order-none">
      <div class="panel-head mint"><h2 class="m-0 text-base font-normal">XP history</h2></div>
      <c:if test="${empty recent}"><p class="muted m-0">No XP yet.</p></c:if>
      <ul class="m-0 grid list-none gap-1 p-0">
        <c:forEach var="l" items="${recent}">
          <li class="flex items-baseline gap-3">
            <span class="min-w-0 flex-1 truncate">${l.source.label}</span>
            <span class="muted whitespace-nowrap">${sg:monthDay(l.createdAt)}</span>
            <span class="w-[4ch] text-right ${l.xpAmount > 0 ? 'text-violet-dark' : 'muted'}">+${l.xpAmount}</span>
          </li>
        </c:forEach>
      </ul>
    </section>
  </div>
</div>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
