// project-manager.js

// Estructura de datos de un proyecto
const PROJECT_SCHEMA = {
  id:          null,       // Generado: 'proj_' + timestamp
  name:        '',
  client:      '',
  color:       '#00D4FF',
  description: '',
  createdAt:   null,       // ISO timestamp
  isActive:    false,
  channels:    [],         // ['facebook', 'instagram', ...] — para fases futuras
};

// CRUD de proyectos en localStorage
const ProjectManager = {

  getAll() {
    return JSON.parse(localStorage.getItem('sodare_projects') || '[]');
  },

  save(projects) {
    localStorage.setItem('sodare_projects', JSON.stringify(projects));
  },

  create(data) {
    const projects = this.getAll();
    const newProject = {
      ...PROJECT_SCHEMA,
      id:        `proj_${Date.now()}`,
      name:      data.name.toUpperCase().trim(),
      client:    data.client.trim(),
      color:     data.color,
      description: data.description.trim(),
      createdAt: new Date().toISOString(),
    };
    projects.push(newProject);
    this.save(projects);
    return newProject;
  },

  setActive(projectId) {
    const projects = this.getAll();
    projects.forEach(p => p.isActive = (p.id === projectId));
    this.save(projects);
    return projects.find(p => p.id === projectId);
  },

  getActive() {
    return this.getAll().find(p => p.isActive) || null;
  },

  delete(projectId) {
    const projects = this.getAll().filter(p => p.id !== projectId);
    this.save(projects);
  },
};

// Interacciones UI

function openNewProjectModal() {
  const modal = document.getElementById('new-project-modal');
  if (modal) modal.style.display = 'flex';
}

function closeNewProjectModal() {
  const modal = document.getElementById('new-project-modal');
  if (modal) {
    modal.style.display = 'none';
    // Clear inputs
    document.getElementById('proj-name').value = '';
    document.getElementById('proj-client').value = '';
    document.getElementById('proj-desc').value = '';
    document.querySelectorAll('.color-opt').forEach(el => el.classList.remove('active'));
    document.querySelector('.color-opt').classList.add('active'); // select first
  }
}

function createProject() {
  const name = document.getElementById('proj-name').value.trim();
  const client = document.getElementById('proj-client').value.trim();
  const color = document.querySelector('.color-opt.active')?.dataset.color || '#00D4FF';
  const desc  = document.getElementById('proj-desc').value.trim();

  if (!name) {
    alert('Project name is required, Commander.');
    return;
  }

  const project = ProjectManager.create({ name, client, color, description: desc });
  ProjectManager.setActive(project.id);

  closeNewProjectModal();
  renderProjectsList();
  updateActiveProjectDisplay(project);
}

// Renderizar lista de proyectos en sidebar
function renderProjectsList() {
  const list = document.getElementById('projects-list');
  if (!list) return;
  const projects = ProjectManager.getAll();

  if (projects.length === 0) {
    list.innerHTML = `
      <p style="padding: 10px 20px; font-family: 'Share Tech Mono'; font-size: 10px; color: var(--text-muted);">No active projects.<br>Initialize one to begin.</p>
    `;
    return;
  }

  list.innerHTML = projects.map(p => `
    <div class="project-item ${p.isActive ? 'active' : ''}"
         onclick="selectProject('${p.id}')">
      <span class="project-dot" style="background:${p.color};
            box-shadow: 0 0 8px ${p.color}88"></span>
      <span class="project-name">${p.name}</span>
      <button class="project-delete" onclick="event.stopPropagation();
              deleteProject('${p.id}')" title="Delete">×</button>
    </div>
  `).join('');
}

function selectProject(projectId) {
  const project = ProjectManager.setActive(projectId);
  renderProjectsList();
  updateActiveProjectDisplay(project);
}

function deleteProject(projectId) {
  if (!confirm('Terminate this project? This cannot be undone.')) return;
  ProjectManager.delete(projectId);
  renderProjectsList();
  const active = ProjectManager.getActive();
  updateActiveProjectDisplay(active);
}

function updateActiveProjectDisplay(project) {
  const nameDisplay = document.getElementById('active-project-name');
  const welcomePanel = document.getElementById('welcome-panel');
  const modulePanel = document.getElementById('module-panel');
  
  if (nameDisplay) {
    nameDisplay.textContent = project ? project.name : 'SELECT PROJECT';
  }

  if (project) {
    if (welcomePanel) welcomePanel.style.display = 'none';
    if (modulePanel) {
      modulePanel.style.display = 'block';
      document.getElementById('module-title').textContent = 'OVERVIEW';
      document.getElementById('module-breadcrumb').textContent = `SODARE / ${project.name} / OVERVIEW`;
    }
  } else {
    if (welcomePanel) welcomePanel.style.display = 'flex';
    if (modulePanel) modulePanel.style.display = 'none';
  }
}

// Color picker logic
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.color-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.color-opt').forEach(el => el.classList.remove('active'));
      e.target.classList.add('active');
    });
  });

  renderProjectsList();
  const active = ProjectManager.getActive();
  updateActiveProjectDisplay(active);
});
