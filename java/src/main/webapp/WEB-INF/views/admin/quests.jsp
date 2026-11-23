<%-- Admin: daily quest templates. --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<ui:pageTitle title="Daily quest templates" sub="Every day each user gets 3 quests of different types from the active templates." />
<ui:flash />
<div class="card mb-4">
  <h2 class="card-title">New template</h2>
  <ui:templateForm goalTypes="${goalTypes}" taskTypes="${taskTypes}" />
</div>
<div class="space-y-3">
  <c:forEach var="t" items="${templates}">
    <div class="card ${t.active ? '' : 'opacity-60'}">
      <div class="mb-2 flex items-center justify-between">
        <span class="badge ${t.active ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'}">${t.active ? 'On' : 'Off'}</span>
        <form method="post" action="${ctx}/admin/quests/toggle">
          <input type="hidden" name="id" value="${t.id}">
          <button class="btn-ghost text-xs">${t.active ? 'Turn off' : 'Turn on'}</button>
        </form>
      </div>
      <ui:templateForm t="${t}" goalTypes="${goalTypes}" taskTypes="${taskTypes}" />
    </div>
  </c:forEach>
</div>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
