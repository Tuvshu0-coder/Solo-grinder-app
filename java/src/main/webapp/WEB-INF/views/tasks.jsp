<%-- Tasks: filter tabs, tasks grouped by urgency (TaskServlet builds ${groups}), and the add-task form. --%>
<%@ include file="/WEB-INF/views/_top.jspf" %>
<ui:pageTitle title="Tasks" sub="The earlier you finish, the more XP. Tasks open for 24h or more earn the early bonus, up to 3 a day." />
<ui:flash />

<div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
  <section class="min-w-0" aria-label="Task list">
    <nav class="mb-6 flex flex-wrap gap-3" aria-label="Filter">
      <c:forEach var="tab" items="${tabs}">
        <a href="${ctx}/tasks?f=${tab[0]}" class="${f == tab[0] ? 'btn' : 'btn-sec'}" ${f == tab[0] ? 'aria-current="page"' : ''}>
          ${tab[1]} <span class="${f == tab[0] ? '' : 'muted'}">${tab[2]}</span>
        </a>
      </c:forEach>
    </nav>

    <c:if test="${taskCount == 0}">
      <div class="panel">
        <p class="m-0">${f == 'done' ? 'No finished tasks yet. Finish your first one to earn XP.' : 'Nothing to do. Add a task on the right.'}</p>
      </div>
    </c:if>

    <div class="grid gap-8">
      <c:forEach var="g" items="${groups}">
        <section class="panel @container">
          <div class="panel-head ${g.head}">
            <h2 class="m-0 text-base font-normal">${g.title}</h2>
            <span>${g.tasks.size()}</span>
          </div>
          <ul class="m-0 list-none p-0">
            <c:forEach var="t" items="${g.tasks}" varStatus="s">
              <%-- container query: text and buttons share a line only when the panel itself is wide enough --%>
              <li class="grid grid-cols-1 items-center gap-x-5 gap-y-3 py-3 @xl:grid-cols-[minmax(0,1fr)_auto] ${s.index > 0 ? 'dash-sep' : ''}">
                <div class="min-w-0">
                  <ui:taskSummary task="${t}" />
                  <c:if test="${t.deadlineEdited and not t.done}"><div class="text-butter-dark">Deadline changed, so at most ×1.0</div></c:if>
                </div>
                <c:choose>
                  <c:when test="${t.done}">
                    <div class="@xl:text-right">
                      <div class="text-violet-dark">+${t.xpEarned} XP</div>
                      <div class="muted">${sg:multiplier(t.multiplier)}</div>
                    </div>
                  </c:when>
                  <c:otherwise>
                    <div class="flex flex-wrap items-center gap-3">
                      <ui:dialog id="task-${t.id}" label="Edit" title="${t.title}">
                        <c:choose>
                          <c:when test="${not empty editBlock[t.id]}"><p class="muted m-0">${editBlock[t.id]}</p></c:when>
                          <c:otherwise>
                            <form method="post" action="${ctx}/tasks/deadline" class="grid gap-2">
                              <input type="hidden" name="id" value="${t.id}">
                              <label class="label" for="dl-${t.id}">New deadline</label>
                              <input id="dl-${t.id}" name="deadline" type="datetime-local" class="input"
                                     value="${sg:localInput(t.deadline)}" min="${minDl}" max="${maxDl}" required>
                              <p class="m-0 text-butter-dark">You can change it once. After that the task earns at most ×1.0.</p>
                              <button class="btn justify-self-start">Save deadline</button>
                            </form>
                          </c:otherwise>
                        </c:choose>
                        <form method="post" action="${ctx}/tasks/delete" class="dash-sep grid gap-2 pt-4">
                          <input type="hidden" name="id" value="${t.id}">
                          <p class="m-0">A deleted task can't be restored.</p>
                          <button class="btn-danger justify-self-start">Delete task</button>
                        </form>
                      </ui:dialog>
                      <ui:completeButton id="${t.id}" returnTo="${returnTo}" />
                    </div>
                  </c:otherwise>
                </c:choose>
              </li>
            </c:forEach>
          </ul>
        </section>
      </c:forEach>
    </div>
  </section>

  <aside class="panel lg:sticky lg:top-8" aria-label="New task">
    <div class="panel-head"><h2 class="m-0 text-base font-normal">New task</h2></div>
    <c:choose>
      <c:when test="${empty subjects}">
        <div class="grid gap-3">
          <p class="m-0">Every task belongs to a subject. Add a subject first.</p>
          <a href="${ctx}/subjects" class="btn justify-self-start">Add a subject</a>
        </div>
      </c:when>
      <c:otherwise>
        <form method="post" action="${ctx}/tasks" class="grid grid-cols-1 gap-4">
          <div>
            <label class="label" for="t-subject">Subject</label>
            <select id="t-subject" name="subjectId" class="input" required>
              <c:forEach var="s" items="${subjects}"><option value="${s.id}"><c:out value="${s.name}" /></option></c:forEach>
            </select>
          </div>
          <div>
            <label class="label" for="t-type">Type</label>
            <select id="t-type" name="type" class="input" required>
              <c:forEach var="type" items="${taskTypes}"><option value="${type}">${type.label}</option></c:forEach>
            </select>
          </div>
          <div>
            <label class="label" for="t-title">Name</label>
            <input id="t-title" name="title" class="input" placeholder="e.g. Lab 3, SQL JOIN" required maxlength="120">
          </div>
          <div>
            <label class="label" for="t-deadline">Deadline</label>
            <input id="t-deadline" name="deadline" type="datetime-local" class="input" value="${defDl}" min="${minDl}" max="${maxDl}" required>
            <p class="muted m-0 mt-1">Between 3 hours and 30 days from now</p>
          </div>
          <button class="btn">Add task</button>
        </form>
      </c:otherwise>
    </c:choose>
  </aside>
</div>
<%@ include file="/WEB-INF/views/_bottom.jspf" %>
