<%-- A button that opens a handheld text-box dialog, using the browser's popover feature (no JavaScript).
     Esc, a click outside, or Cancel closes it. The body goes inside the dialog. --%>
<%@ tag body-content="scriptless" pageEncoding="UTF-8" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ attribute name="id" required="true" %>
<%@ attribute name="label" required="true" %>
<%@ attribute name="title" required="true" %>
<%@ attribute name="btn" %>
<button type="button" class="${empty btn ? 'btn-ghost' : btn}" popovertarget="${id}">${label}</button>
<div id="${id}" popover="auto" class="pop" role="dialog" aria-labelledby="${id}-t">
  <h2 id="${id}-t" class="pop-title"><c:out value="${title}" /></h2>
  <div class="grid gap-5"><jsp:doBody /></div>
  <button type="button" class="btn-sec mt-5" popovertarget="${id}" popovertargetaction="hide">Cancel</button>
</div>
