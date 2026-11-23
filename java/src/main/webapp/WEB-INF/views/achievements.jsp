<%-- Achievements: unlocked count, then one ladder per condition joined by a pellet trail. --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<ui:pageTitle title="Achievement" sub="Each achievement can be earned once." />

<div class="hud mb-10 flex flex-wrap items-center gap-x-8 gap-y-3">
  ${sg:icon('medal', 4, '')}
  <div class="text-3xl">${unlockedCount}/${total}</div>
  <div class="min-w-[200px] flex-1">
    <div class="muted">unlocked</div>
    ${sg:seg(unlockedCount, total, 0, 'violet')}
  </div>
</div>

<div class="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
  <c:forEach var="l" items="${ladders}">
    <section class="panel">
      <div class="panel-head">
        <h2 class="m-0 text-base font-normal">${l.label}</h2>
        <span>Now ${l.current}</span>
      </div>
      <ol class="ladder">
        <c:forEach var="tier" items="${l.tiers}">
          <c:set var="a" value="${tier.achievement}" />
          <c:set var="on" value="${not empty tier.unlockedAt}" />
          <li class="${tier.nextOn ? 'on' : ''}">
            <span class="slot ${on ? '' : 'locked'}">${on ? sg:icon('medal', 3, '') : sg:icon('lock', 3, 'gray')}</span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 class="m-0 text-base font-normal ${on ? '' : 'text-ink-2'}"><c:out value="${a.name}" /></h3>
                <span class="badge ${on ? 'badge-violet' : 'badge-vl'}">+${a.xpReward} XP</span>
              </div>
              <p class="muted m-0"><c:out value="${a.description}" /></p>
              <c:choose>
                <c:when test="${on}"><p class="m-0 text-violet-dark">Unlocked ${sg:day(tier.unlockedAt)}</p></c:when>
                <c:otherwise>
                  <div class="flex flex-wrap items-center gap-x-3">
                    ${sg:seg(l.current, a.threshold, sg:min(a.threshold, 10), 'violet')}
                    <span class="muted">${sg:min(l.current, a.threshold)}/${a.threshold}</span>
                  </div>
                </c:otherwise>
              </c:choose>
            </div>
          </li>
        </c:forEach>
      </ol>
    </section>
  </c:forEach>
</div>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
