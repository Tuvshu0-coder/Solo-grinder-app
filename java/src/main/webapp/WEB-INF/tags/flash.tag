<%-- The result of the last action, from ?msg=... or ?err=... in the URL, in a handheld-style text box. --%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="sg" uri="/WEB-INF/sg.tld" %>
<c:set var="isErr" value="${not empty param.err}" />
<c:if test="${isErr or not empty param.msg}">
  <div class="dialog mb-6 flex items-start gap-3 ${isErr ? 'text-rose-dark' : ''}" role="${isErr ? 'alert' : 'status'}">
    <span class="pt-2">${sg:icon('cursor', 3, isErr ? 'rose' : '')}</span>
    <span><c:out value="${isErr ? param.err : param.msg}" /></span>
  </div>
</c:if>
