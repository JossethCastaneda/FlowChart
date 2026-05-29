// auth-manager.js

const SODARE_ROUTES = {
  public:    ['login.html', 'index.html', ''],
  protected: ['dashboard.html'], 
};

function guardRoute() {
  const path = window.location.pathname;
  let currentPage = path.split('/').pop();
  if (!currentPage) currentPage = 'index.html';

  const isProtected = SODARE_ROUTES.protected.includes(currentPage);

  if (!isProtected) return; 

  const token   = sessionStorage.getItem('sodare_token');
  const user    = sessionStorage.getItem('sodare_user');

  if (!token || !user) {
    // Sin sesión → redirigir a login
    window.location.href = 'login.html';
    return;
  }

  // Verificar que el token de FB sigue activo si FB object existe
  if (typeof FB !== 'undefined') {
    FB.getLoginStatus(function(response) {
      if (response.status !== 'connected') {
        sessionStorage.clear();
        window.location.href = 'login.html';
      }
    });
  }
}

// Función global de logout
function sodareLogout() {
  if (typeof FB !== 'undefined') {
    FB.logout(function() {
      sessionStorage.clear();
      window.location.href = 'login.html';
    });
  } else {
    sessionStorage.clear();
    window.location.href = 'login.html';
  }
}

// Ejecutar guard al cargar cualquier página protegida
document.addEventListener('DOMContentLoaded', guardRoute);
