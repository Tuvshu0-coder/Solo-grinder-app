<%-- One sidebar menu item. The pixel cursor is only visible on the current page (CSS), its slot keeps labels aligned. --%>
<%@ tag body-content="empty" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="sg" uri="/WEB-INF/sg.tld" %>
<%@ attribute name="href" required="true" %>
<%@ attribute name="label" required="true" %>
<%@ attribute name="on" type="java.lang.Boolean" %>
<a href="${pageContext.request.contextPath}${href}" class="tab ${on ? 'on' : ''}" ${on ? 'aria-current="page"' : ''}>${sg:icon('cursor', 3, 'white')}${label}</a>
