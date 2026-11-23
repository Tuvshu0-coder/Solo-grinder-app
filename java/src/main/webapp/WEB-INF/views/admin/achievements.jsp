<%-- Admin: achievements. --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<ui:pageTitle title="Achievement" sub="Achievement XP counts toward the 400 XP daily cap." />
<ui:flash />
<div class="card mb-4">
  <h2 class="card-title">New achievement</h2>
  <ui:achievementForm conditionTypes="${conditionTypes}" />
</div>
<div class="space-y-3">
  <c:forEach var="a" items="${achievements}">
    <div class="card"><ui:achievementForm a="${a}" conditionTypes="${conditionTypes}" /></div>
  </c:forEach>
</div>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
