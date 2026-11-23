<%-- Title, subject (and type), time left and deadline of a task. compact = the short dashboard version. --%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="sg" uri="/WEB-INF/sg.tld" %>
<%@ attribute name="task" required="true" type="model.Task" %>
<%@ attribute name="compact" type="java.lang.Boolean" %>
<div class="min-w-0">
  <div class="truncate"><c:out value="${task.title}" /></div>
  <c:choose>
    <c:when test="${compact}">
      <div class="flex flex-wrap gap-x-4">
        <span class="muted truncate"><c:out value="${task.subjectName}" /></span>
        <c:if test="${not task.done}"><span class="${sg:timeTone(task)}">${sg:timeLeft(task)}</span></c:if>
      </div>
    </c:when>
    <c:otherwise>
      <div class="muted truncate"><c:out value="${task.subjectName}" /> / ${task.type.label}</div>
      <div class="flex flex-wrap gap-x-4">
        <c:if test="${not task.done}"><span class="${sg:timeTone(task)}">${sg:timeLeft(task)}</span></c:if>
        <span class="muted">${sg:fmt(task.deadline)}</span>
      </div>
    </c:otherwise>
  </c:choose>
</div>
