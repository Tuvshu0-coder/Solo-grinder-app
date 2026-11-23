<%-- Admin: how the whole system is doing. ${stats} = label -> number (AdminServlet). --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<ui:pageTitle title="Stats" sub="How the whole system is doing" />
<ui:flash />
<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
  <c:forEach var="s" items="${stats}">
    <div class="card">
      <div class="text-2xl font-bold">${sg:num(s.value)}</div>
      <div class="text-sm text-muted">${s.key}</div>
    </div>
  </c:forEach>
</div>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
