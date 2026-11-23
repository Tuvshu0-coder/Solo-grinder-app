<%-- Add or edit one achievement (a = null for a new one). --%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ attribute name="a" type="model.Achievement" %>
<%@ attribute name="conditionTypes" required="true" type="java.lang.Object" %>
<form method="post" action="${pageContext.request.contextPath}/admin/achievements" class="grid gap-2 md:grid-cols-[1.2fr_2fr_1.3fr_0.6fr_0.6fr_auto] md:items-end">
  <input type="hidden" name="id" value="${a.id}">
  <div>
    <label class="label">Name</label>
    <input name="name" value="<c:out value='${a.name}' />" class="input" required>
  </div>
  <div>
    <label class="label">Description <c:if test="${not empty a}"><span>(${a.userCount} users earned it)</span></c:if></label>
    <input name="description" value="<c:out value='${a.description}' />" class="input">
  </div>
  <div>
    <label class="label">Condition</label>
    <select name="conditionType" class="input">
      <c:forEach var="ct" items="${conditionTypes}">
        <option value="${ct}" ${(empty a ? 'STREAK' : a.conditionType) == ct ? 'selected' : ''}>${ct.label}</option>
      </c:forEach>
    </select>
  </div>
  <div>
    <label class="label">Threshold</label>
    <input name="threshold" type="number" min="1" value="${empty a ? 1 : a.threshold}" class="input" required>
  </div>
  <div>
    <label class="label">XP</label>
    <input name="xpReward" type="number" min="0" value="${empty a ? 50 : a.xpReward}" class="input" required>
  </div>
  <button class="btn h-9">${empty a ? '+ Add' : 'Save'}</button>
</form>
