// fb-auth.js
window.fbAsyncInit = function() {
  FB.init({
    appId      : SODARE_CONFIG.facebook.appId,
    cookie     : true,
    xfbml      : true,
    version    : SODARE_CONFIG.facebook.apiVersion
  });
  FB.AppEvents.logPageView();
  checkExistingSession();
};

// Carga async del SDK
(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) { return; }
  js = d.createElement(s); js.id = id;
  js.src = "https://connect.facebook.net/en_US/sdk.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

function handleFacebookLogin() {
  setButtonState('loading');
  setStatus('connecting', 'Establishing hyperspace connection...');

  FB.login(function(response) {
    if (response.authResponse) {
      handleAuthSuccess(response);
    } else {
      handleAuthError('Login cancelled or not authorized');
    }
  }, {
    scope: SODARE_CONFIG.facebook.scope,
    return_scopes: true
  });
}

function handleAuthSuccess(response) {
  const { accessToken, userID } = response.authResponse;

  // Obtener datos del usuario
  FB.api('/me', { fields: 'id,name,email,picture' }, function(userData) {
    if (userData && !userData.error) {
      // Guardar sesión
      sessionStorage.setItem('sodare_token', accessToken);
      sessionStorage.setItem('sodare_user', JSON.stringify(userData));
      sessionStorage.setItem('sodare_user_id', userID);

      setStatus('success', `Welcome, ${userData.name}. The Force is with you.`);
      setButtonState('success');

      // Redirigir al dashboard con delay épico
      setTimeout(() => {
        window.location.href = SODARE_CONFIG.app.dashboardUrl;
      }, 1800);
    } else {
      handleAuthError(userData.error?.message || 'Failed to retrieve user data');
    }
  });
}

function handleAuthError(message) {
  setButtonState('idle');
  setStatus('error', `⚠ ${message}`);
  console.error('[SODARE AUTH]', message);
}

// Verificar sesión existente al cargar
function checkExistingSession() {
  FB.getLoginStatus(function(response) {
    if (response.status === 'connected') {
      const savedUser = sessionStorage.getItem('sodare_user');
      if (savedUser) {
        setStatus('info', 'Active session detected. Redirecting...');
        setTimeout(() => {
          window.location.href = SODARE_CONFIG.app.dashboardUrl;
        }, 1000);
      }
    }
  });
}

function setButtonState(state) {
  const btn = document.getElementById('fb-login-btn');
  const loader = document.getElementById('fb-loader');
  const label = btn.querySelector('.fb-label');

  if (!btn || !loader || !label) return;

  const states = {
    idle:    { label: 'CONNECT WITH FACEBOOK', disabled: false, loader: false },
    loading: { label: 'ESTABLISHING CONNECTION', disabled: true,  loader: true  },
    success: { label: 'CONNECTION ESTABLISHED', disabled: true,  loader: false },
    error:   { label: 'RETRY CONNECTION', disabled: false, loader: false },
  };

  const s = states[state] || states.idle;
  label.textContent = s.label;
  btn.disabled = s.disabled;
  loader.style.display = s.loader ? 'flex' : 'none';
  btn.setAttribute('data-state', state);
}

function setStatus(type, message) {
  const el = document.getElementById('auth-status');
  if (!el) return;
  el.textContent = message;
  el.setAttribute('data-type', type);
  el.style.opacity = '1';
}
