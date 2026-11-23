<%-- Subjects: add form, then one card per subject with a pellet per task (filled = done). --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<ui:pageTitle title="Subjects" sub="Every task belongs to one subject." />
<ui:flash />

<form method="post" action="${ctx}/subjects" class="panel mb-10 flex flex-wrap items-end gap-4">
  <div class="min-w-[240px] flex-1">
    <label class="label" for="s-name">New subject</label>
    <input id="s-name" name="name" class="input" placeholder="e.g. Databases" required maxlength="60">
  </div>
  <button class="btn">Add subject</button>
</form>

<c:choose>
  <c:when test="${empty subjects}">
    <div class="panel"><p class="m-0">No subjects yet. Type your first one above and add it.</p></div>
  </c:when>
  <c:otherwise>
    <ul class="m-0 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 xl:grid-cols-3">
      <c:forEach var="s" items="${subjects}">
        <li class="panel flex flex-col gap-3">
          <h2 class="m-0 text-xl font-normal break-words"><c:out value="${s.name}" /></h2>
          <c:choose>
            <c:when test="${s.total == 0}"><p class="muted m-0">No tasks yet</p></c:when>
            <c:otherwise>
              <div class="flex flex-wrap items-center gap-x-4">
                ${sg:seg(s.done, s.total, sg:min(s.total, 12), 'violet')}
                <span class="muted">${s.done}/${s.total} done</span>
              </div>
            </c:otherwise>
          </c:choose>
          <div class="flex flex-wrap gap-x-6">
            <span>${s.open} to do</span>
            <c:if test="${s.late > 0}"><span class="text-rose-dark">${s.late} late</span></c:if>
          </div>
          <div class="mt-auto pt-2">
            <ui:dialog id="subject-${s.id}" label="Edit" title="${s.name}">
              <form method="post" action="${ctx}/subjects/rename" class="grid gap-2">
                <input type="hidden" name="id" value="${s.id}">
                <label class="label" for="sn-${s.id}">Name</label>
                <input id="sn-${s.id}" name="name" value="<c:out value='${s.name}' />" class="input" required maxlength="60">
                <button class="btn justify-self-start">Save name</button>
              </form>
              <form method="post" action="${ctx}/subjects/delete" class="dash-sep grid gap-2 pt-4">
                <input type="hidden" name="id" value="${s.id}">
                <p class="m-0">${s.total > 0 ? 'This deletes the subject and all ' += s.total += ' of its tasks.' : 'This deletes the subject.'} It can't be restored.</p>
                <button class="btn-danger justify-self-start">Delete subject</button>
              </form>
            </ui:dialog>
          </div>
        </li>
      </c:forEach>
    </ul>
  </c:otherwise>
</c:choose>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
