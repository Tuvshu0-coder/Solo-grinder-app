<%-- Admin: students, search, suspend / restore. --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<ui:pageTitle title="Users" sub="Suspended users can't log in. Their XP is kept and they're hidden from leaderboards." />
<ui:flash />
<form method="get" action="${ctx}/admin/users" class="mb-4 flex max-w-sm gap-2">
  <input name="q" value="<c:out value='${q}' />" class="input" placeholder="Search by username">
  <button class="btn-ghost">Search</button>
</form>
<div class="card overflow-x-auto">
  <table class="table">
    <thead>
      <tr><th>Name</th><th>Level</th><th>XP</th><th>Streak</th><th>Guild</th><th>Joined</th><th>Status</th><th></th></tr>
    </thead>
    <tbody>
      <c:forEach var="u" items="${users}">
        <tr>
          <td class="font-medium"><c:out value="${u.username}" /></td>
          <td><span class="inline-flex items-center gap-2">${sg:rank(u.rank, false)} ${u.levelId}</span></td>
          <td>${sg:num(u.totalXp)}</td>
          <td>${u.streak}</td>
          <td>${empty u.guildName ? '—' : ''}<c:out value="${u.guildName}" /></td>
          <td class="text-muted">${sg:fmt(u.createdAt)}</td>
          <td>
            <c:choose>
              <c:when test="${u.suspended}"><span class="badge bg-bad/15 text-bad">Suspended</span></c:when>
              <c:otherwise><span class="badge bg-good/15 text-good">Active</span></c:otherwise>
            </c:choose>
          </td>
          <td class="text-right">
            <form method="post" action="${ctx}/admin/users/suspend">
              <input type="hidden" name="userId" value="${u.id}">
              <input type="hidden" name="suspend" value="${u.suspended ? '0' : '1'}">
              <button class="${u.suspended ? 'btn-ghost' : 'btn-danger'}">${u.suspended ? 'Restore' : 'Suspend'}</button>
            </form>
          </td>
        </tr>
      </c:forEach>
    </tbody>
  </table>
  <c:if test="${empty users}"><p class="text-sm text-muted">No users found.</p></c:if>
</div>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
