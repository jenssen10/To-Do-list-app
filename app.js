const STORAGE_KEY = 'todo-tasks-v1';
const THEME_KEY = 'todo-theme-v1';
let tasks = [];

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function load(){ try{ tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ tasks = []; } }

// If no tasks exist, populate some helpful sample tasks the first time
function ensureSampleTasks(){
  if(!tasks || tasks.length === 0){
    tasks = [
      { id: uid(), text: 'Welcome — add your first task', done: false, created: Date.now() - 30000 },
      { id: uid(), text: 'Double-click or press Enter on a task to edit it', done: false, created: Date.now() - 20000 },
      { id: uid(), text: 'Drag tasks to reorder them (filter must be All)', done: false, created: Date.now() - 10000 }
    ];
    save();
  }
}

function render(){
  const list = document.getElementById('task-list');
  const filter = getFilter();
  list.innerHTML = '';
  // update counts on filter buttons
  const totalCount = tasks.length;
  const activeCount = tasks.filter(t=>!t.done).length;
  const completedCount = tasks.filter(t=>t.done).length;
  const btnAll = document.getElementById('filter-all');
  const btnActive = document.getElementById('filter-active');
  const btnCompleted = document.getElementById('filter-completed');
  if(btnAll) btnAll.querySelector('.count').textContent = totalCount;
  if(btnActive) btnActive.querySelector('.count').textContent = activeCount;
  if(btnCompleted) btnCompleted.querySelector('.count').textContent = completedCount;
  const visible = tasks.filter(t => filter==='all' ? true : (filter==='active' ? !t.done : t.done));
  visible.forEach(t => {
    const draggable = (filter === 'all');
    const li = document.createElement('li');
    li.className = 'task-item' + (t.done ? ' completed' : '');
    li.setAttribute('role', 'listitem');
    // drag handle (affordance)
    
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'drag-handle';
    handle.setAttribute('aria-hidden', draggable ? 'false' : 'true');
    handle.title = 'Drag to reorder';
    handle.innerText = '☰';
    // keep handle non-draggable; the li is draggable
    handle.draggable = false;
    handle.tabIndex = 0;

    // checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'chk-' + t.id;
    checkbox.checked = !!t.done;
    checkbox.setAttribute('aria-label', t.text ? `Mark '${t.text}' completed` : 'Mark task completed');
    checkbox.addEventListener('change', ()=>{ toggleDone(t.id); });

    // label connected to checkbox - keyboard accessible and editable via Enter/F2
    const label = document.createElement('label');
    label.className = 'label';
    label.htmlFor = checkbox.id;
    label.textContent = t.text;
    label.title = 'Double-click or press Enter to edit';
    label.tabIndex = 0;
    label.addEventListener('dblclick', ()=>{ editTask(t.id); });
    label.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === 'F2'){ editTask(t.id); } });

    const actions = document.createElement('div'); actions.className = 'actions';
    // Move up / move down buttons
    const moveUp = document.createElement('button'); moveUp.type = 'button'; moveUp.className = 'move-btn move-up'; moveUp.innerText = '▲'; moveUp.title = 'Move up'; moveUp.setAttribute('aria-label', `Move '${t.text}' up`);
    moveUp.addEventListener('click', ()=>{ moveTask(t.id, 'up'); });
    const moveDown = document.createElement('button'); moveDown.type = 'button'; moveDown.className = 'move-btn move-down'; moveDown.innerText = '▼'; moveDown.title = 'Move down'; moveDown.setAttribute('aria-label', `Move '${t.text}' down`);
    moveDown.addEventListener('click', ()=>{ moveTask(t.id, 'down'); });
    const del = document.createElement('button'); del.type = 'button'; del.innerText = '🗑'; del.title = 'Delete'; del.setAttribute('aria-label', `Delete '${t.text}'`);
    del.addEventListener('click', ()=>{ deleteTask(t.id); });
    actions.appendChild(moveUp);
    actions.appendChild(moveDown);
    actions.appendChild(del);

    // append handle before the checkbox for visual affordance
    li.appendChild(handle);
    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(actions);

    // drag-and-drop: only allow reordering when showing all tasks
    
    li.draggable = draggable;
    if(!draggable) li.setAttribute('aria-disabled', 'true'); else li.removeAttribute('aria-disabled');

    if(draggable){
      li.addEventListener('dragstart', (e)=>{
        e.dataTransfer.setData('text/plain', t.id);
        li.classList.add('dragging');
      });
      li.addEventListener('dragover', (e)=>{ e.preventDefault(); li.classList.add('drag-over'); });
      li.addEventListener('dragleave', ()=>{ li.classList.remove('drag-over'); });
      li.addEventListener('drop', (e)=>{
        e.preventDefault(); li.classList.remove('drag-over');
        const draggedId = e.dataTransfer.getData('text/plain');
        // build new order based on DOM
        const newOrder = Array.from(list.children).map(child => {
          const chk = child.querySelector('input[type="checkbox"]');
          return chk ? chk.id.replace('chk-','') : null;
        }).filter(Boolean);
        // reorder tasks array to match newOrder, then append any missing tasks (shouldn't happen)
        const reordered = newOrder.map(id => tasks.find(x=>x.id === id)).filter(Boolean);
        const remaining = tasks.filter(x => !newOrder.includes(x.id));
        tasks = reordered.concat(remaining);
        save(); render();
      });
      li.addEventListener('dragend', ()=>{ li.classList.remove('dragging'); const all = document.querySelectorAll('.drag-over'); all.forEach(a=>a.classList.remove('drag-over')); });
    }

    // disable move buttons at boundaries
    const idx = tasks.findIndex(x => x.id === t.id);
    const isFirst = idx === 0;
    const isLast = idx === tasks.length - 1;
    const upBtn = actions.querySelector('.move-up');
    const downBtn = actions.querySelector('.move-down');
    if(upBtn) upBtn.disabled = isFirst;
    if(downBtn) downBtn.disabled = isLast;

    // reflect checked state for screen readers
    if(t.done) li.setAttribute('aria-checked', 'true'); else li.setAttribute('aria-checked', 'false');
    list.appendChild(li);
  });
}

/* Theme handling */
function applyTheme(theme){
  try{
    if(theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    const btn = document.getElementById('theme-toggle');
    if(btn){
      const pressed = (theme === 'dark');
      btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      btn.textContent = pressed ? '☀️' : '🌙';
    }
  }catch(e){/* ignore */}
}

function loadTheme(){
  const stored = localStorage.getItem(THEME_KEY);
  if(stored) return stored;
  // fallback to prefers-color-scheme
  try{
    if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  }catch(e){}
  return 'light';
}

function toggleTheme(){
  const current = loadTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

/* Filter helpers (segmented control) */
function getFilter(){
  const active = document.querySelector('.filter-btn.active');
  return active ? active.dataset.filter : 'all';
}

function setFilter(name){
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    const is = (btn.dataset.filter === name);
    btn.classList.toggle('active', is);
    btn.setAttribute('aria-pressed', is ? 'true' : 'false');
  });
}

function addTask(text){
  const trimmed = (text||'').trim(); if(!trimmed) return;
  tasks.unshift({ id: uid(), text: trimmed, done:false, created: Date.now() });
  save(); render();
}

function toggleDone(id){
  const t = tasks.find(x=>x.id===id); if(!t) return; t.done = !t.done; save(); render();
}

function deleteTask(id){ tasks = tasks.filter(x=>x.id!==id); save(); render(); }

function editTask(id){
  const t = tasks.find(x=>x.id===id); if(!t) return; const v = prompt('Edit task', t.text); if(v==null) return; t.text = v.trim() || t.text; save(); render();
}

function clearCompleted(){ tasks = tasks.filter(x=>!x.done); save(); render(); }

function moveTask(id, dir){
  const idx = tasks.findIndex(x=>x.id === id);
  if(idx === -1) return;
  const target = dir === 'up' ? idx - 1 : idx + 1;
  if(target < 0 || target >= tasks.length) return;
  // swap
  const tmp = tasks[target];
  tasks[target] = tasks[idx];
  tasks[idx] = tmp;
  save(); render();
}

document.addEventListener('DOMContentLoaded', ()=>{
  load();
  ensureSampleTasks();
  // theme init
  const initialTheme = loadTheme();
  applyTheme(initialTheme);
  render();
  document.getElementById('task-form').addEventListener('submit', e=>{
    e.preventDefault(); const input = document.getElementById('task-input'); addTask(input.value); input.value=''; input.focus();
  });
  // wire filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(b => b.addEventListener('click', (e)=>{ setFilter(b.dataset.filter); render(); }));
  document.getElementById('clear-completed').addEventListener('click', ()=>{ clearCompleted(); });
  const themeBtn = document.getElementById('theme-toggle');
  if(themeBtn){ themeBtn.addEventListener('click', ()=>{ toggleTheme(); }); }
});
