<%-- "Done" button for a task. returnTo = the page to come back to afterwards. --%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="sg" uri="/WEB-INF/sg.tld" %>
<%@ attribute name="id" required="true" type="java.lang.Integer" %>
<%@ attribute name="returnTo" required="true" %>
<form method="post" action="${pageContext.request.contextPath}/tasks/complete">
  <input type="hidden" name="id" value="${id}">
  <input type="hidden" name="returnTo" value="<c:out value='${returnTo}' />">
  <button class="btn">${sg:icon('check', 2, '')} Done</button>
</form>
