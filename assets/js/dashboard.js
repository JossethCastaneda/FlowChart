// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
  // Sidebar Toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');

  if (sidebarToggle && sidebar && mainContent) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('expanded');
    });
  }

  // Populate User Data
  const userStr = sessionStorage.getItem('sodare_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const nameDisplay = document.getElementById('user-name-display');
      const avatar = document.getElementById('user-avatar');
      
      if (nameDisplay) nameDisplay.textContent = user.name || 'PILOT';
      if (avatar && user.picture && user.picture.data) {
        avatar.src = user.picture.data.url;
      }
    } catch (e) {
      console.error('Error parsing user data', e);
    }
  }

  // User Dropdown toggle
  const userChip = document.getElementById('user-chip');
  const userDropdown = document.getElementById('user-dropdown');
  if (userChip && userDropdown) {
    userChip.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
      
      // Update dropdown info
      if (userStr && userDropdown.style.display === 'block') {
        const user = JSON.parse(userStr);
        document.getElementById('ud-name').textContent = user.name || 'Unknown Pilot';
        document.getElementById('ud-email').textContent = user.email || 'No email';
        const lgAvatar = document.getElementById('user-avatar-lg');
        if (lgAvatar && user.picture && user.picture.data) {
          lgAvatar.src = user.picture.data.url;
        }
      }
    });
  }

  // Hide dropdowns when clicking outside
  document.addEventListener('click', () => {
    if (userDropdown) userDropdown.style.display = 'none';
  });
});
