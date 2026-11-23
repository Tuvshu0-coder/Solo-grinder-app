<%-- Add or edit one daily quest template (t = null for a new one). --%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ attribute name="t" type="model.QuestTemplate" %>
<%@ attribute name="goalTypes" required="true" type="java.lang.Object" %>
<%@ attribute name="taskTypes" required="true" type="java.lang.Object" %>
<form method="post" action="${pageContext.request.contextPath}/admin/quests" class="grid gap-2 md:grid-cols-[2fr_1.3fr_1.3fr_0.6fr_0.6fr_auto] md:items-end">
  <input type="hidden" name="id" value="${t.id}">
  <div>
    <label class="label">Title</label>
    <input name="title" value="<c:out value='${t.title}' />" class="input" required>
  </div>
  <div>
    <label class="label">Goal type</label>
    <select name="goalType" class="input">
      <c:forEach var="g" items="${goalTypes}">
        <option value="${g}" ${(empty t ? 'COMPLETE_N' : t.goalType) == g ? 'selected' : ''}>${g.label}</option>
      </c:forEach>
    </select>
  </div>
  <div>
    <label class="label">Task type</label>
    <select name="taskType" class="input">
      <option value="">—</option>
      <c:forEach var="type" items="${taskTypes}">
        <option value="${type}" ${t.taskType == type ? 'selected' : ''}>${type.label}</option>
      </c:forEach>
    </select>
  </div>
  <div>
    <label class="label">Target</label>
    <input name="targetValue" type="number" min="1" value="${empty t ? 1 : t.targetValue}" class="input" required>
  </div>
  <div>
    <label class="label">XP</label>
    <input name="xpReward" type="number" min="0" value="${empty t ? 20 : t.xpReward}" class="input" required>
  </div>
  <button class="btn h-9">${empty t ? '+ Add' : 'Save'}</button>
</form>
