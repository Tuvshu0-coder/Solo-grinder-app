<%-- Page heading: pixel cursor + title + pellet rule + optional one-line explanation. --%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="sg" uri="/WEB-INF/sg.tld" %>
<%@ attribute name="title" required="true" %>
<%@ attribute name="sub" %>
<div class="mb-6">
  <h1 class="section-title">${sg:icon('cursor', 4, '')}<c:out value="${title}" /></h1>
  <div class="rule" style="margin-bottom: ${empty sub ? 18 : 8}px"></div>
  <c:if test="${not empty sub}"><p class="muted m-0"><c:out value="${sub}" /></p></c:if>
</div>
