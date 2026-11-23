<%-- Log in / Sign up, on the pixel night-city scene. ${mode} = "login" or "register" (AuthServlet). --%>
<%@ include file="/WEB-INF/views/_head.jspf" %>
<c:set var="login" value="${mode == 'login'}" />
<body class="min-h-screen">
<main class="scene flex min-h-screen items-center justify-center px-4">
  <div class="scene-text w-full max-w-[450px]">
    <div class="mb-6 text-center">
      <div class="text-3xl"><b>SOLO</b> GRINDING</div>
      <p class="m-0 mt-2">Finish your work early. Level up. Carry your guild.</p>
    </div>
    <h1 class="scene-rule">${login ? 'Log in' : 'Sign up'}</h1>
    <ui:flash />
    <form method="post" action="${ctx}/${mode}" class="grid gap-5">
      <div>
        <label class="scene-label" for="username">Username</label>
        <input id="username" name="username" class="scene-input" required autocomplete="username">
      </div>
      <div>
        <label class="scene-label" for="password">Password</label>
        <input id="password" name="password" type="password" class="scene-input" required
               autocomplete="${login ? 'current-password' : 'new-password'}">
      </div>
      <button class="btn-sec mt-2 w-full">${login ? 'Log in' : 'Sign up'}</button>
    </form>
    <p class="mt-6 text-center">
      ${login ? 'No account yet?' : 'Already have an account?'}
      <a href="${ctx}/${login ? 'register' : 'login'}" class="underline">${login ? 'Sign up' : 'Log in'}</a>
    </p>
  </div>
</main>
</body>
</html>
