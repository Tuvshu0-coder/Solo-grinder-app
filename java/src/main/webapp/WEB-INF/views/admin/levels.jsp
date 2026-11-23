<%-- Admin: levels and ranks. Saving one recalculates every user's level. --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<ui:pageTitle title="Levels and ranks" sub="Default threshold: 20 × L². After a change, every user's level is recalculated." />
<ui:flash />
<div class="card mb-4">
  <h2 class="card-title">Add level</h2>
  <form method="post" action="${ctx}/admin/levels" class="flex flex-wrap items-end gap-2">
    <input type="hidden" name="id" value="${nextId}">
    <div class="text-sm">Level ${nextId}</div>
    <input name="minXp" type="number" min="0" value="${nextMinXp}" class="input w-36" required>
    <input name="rank" value="S" class="input w-16" maxlength="1" required>
    <button class="btn">+ Add</button>
  </form>
</div>
<div class="card overflow-x-auto">
  <table class="table">
    <thead><tr><th>Level</th><th>Rank</th><th>Users</th><th>Threshold XP / Rank</th></tr></thead>
    <tbody>
      <c:forEach var="l" items="${levels}">
        <tr>
          <td class="font-medium">${l.id}</td>
          <td>${sg:rank(l.rank, false)}</td>
          <td class="text-muted">${l.userCount}</td>
          <td>
            <form method="post" action="${ctx}/admin/levels" class="flex gap-2">
              <input type="hidden" name="id" value="${l.id}">
              <input name="minXp" type="number" min="0" value="${l.minXp}" class="input w-36" required>
              <input name="rank" value="${l.rank}" class="input w-16" maxlength="1" required>
              <button class="btn-ghost">Save</button>
            </form>
          </td>
        </tr>
      </c:forEach>
    </tbody>
  </table>
</div>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
