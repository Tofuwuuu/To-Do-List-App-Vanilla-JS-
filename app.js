const STORAGE_KEY = "todo.items.v1";

/** @typedef {{ id: string, text: string, completed: boolean, createdAt: number }} Todo */

/** @returns {string} */
function uid() {
  // Non-crypto id; sufficient for local todo items.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** @param {unknown} value @returns {value is Todo[]} */
function isTodoArray(value) {
  if (!Array.isArray(value)) return false;
  return value.every(
    (t) =>
      t &&
      typeof t === "object" &&
      typeof t.id === "string" &&
      typeof t.text === "string" &&
      typeof t.completed === "boolean" &&
      typeof t.createdAt === "number",
  );
}

/** @returns {Todo[]} */
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!isTodoArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/** @param {Todo[]} todos */
function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/** @param {string} s */
function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

const els = {
  addForm: /** @type {HTMLFormElement} */ (document.getElementById("addForm")),
  newTodo: /** @type {HTMLInputElement} */ (document.getElementById("newTodo")),
  list: /** @type {HTMLUListElement} */ (document.getElementById("todoList")),
  remaining: /** @type {HTMLElement} */ (document.getElementById("remainingCount")),
  total: /** @type {HTMLElement} */ (document.getElementById("totalCount")),
  clearCompleted: /** @type {HTMLButtonElement} */ (document.getElementById("clearCompleted")),
  emptyState: /** @type {HTMLElement} */ (document.getElementById("emptyState")),
  filterButtons: /** @type {NodeListOf<HTMLButtonElement>} */ (
    document.querySelectorAll("[data-filter]")
  ),
};

/** @type {Todo[]} */
let todos = loadTodos();
/** @type {"all"|"active"|"completed"} */
let activeFilter = "all";
/** @type {string|null} */
let editingId = null;
/** @type {string} */
let editingDraft = "";

function filteredTodos() {
  if (activeFilter === "active") return todos.filter((t) => !t.completed);
  if (activeFilter === "completed") return todos.filter((t) => t.completed);
  return todos;
}

function setFilter(next) {
  activeFilter = next;
  els.filterButtons.forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.filter === next));
  });
  render();
}

/** @param {string} text */
function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos = [{ id: uid(), text: trimmed, completed: false, createdAt: Date.now() }, ...todos];
  saveTodos(todos);
  render();
}

/** @param {string} id */
function toggleTodo(id) {
  todos = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
  saveTodos(todos);
  render();
}

/** @param {string} id */
function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  if (editingId === id) {
    editingId = null;
    editingDraft = "";
  }
  saveTodos(todos);
  render();
}

/** @param {string} id */
function startEdit(id) {
  const t = todos.find((x) => x.id === id);
  if (!t) return;
  editingId = id;
  editingDraft = t.text;
  render(() => {
    const input = /** @type {HTMLInputElement|null} */ (
      els.list.querySelector(`input[data-edit="${CSS.escape(id)}"]`)
    );
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function cancelEdit() {
  editingId = null;
  editingDraft = "";
  render();
}

/** @param {string} nextText */
function updateEditingDraft(nextText) {
  editingDraft = nextText;
}

function commitEdit() {
  if (!editingId) return;
  const nextText = editingDraft.trim();
  if (!nextText) {
    // Empty edit => treat as delete (common todo UX).
    deleteTodo(editingId);
    return;
  }
  todos = todos.map((t) => (t.id === editingId ? { ...t, text: nextText } : t));
  editingId = null;
  editingDraft = "";
  saveTodos(todos);
  render();
}

function clearCompleted() {
  const before = todos.length;
  todos = todos.filter((t) => !t.completed);
  if (todos.length !== before) saveTodos(todos);
  render();
}

/** @param {() => void} [after] */
function render(after) {
  const remaining = todos.filter((t) => !t.completed).length;
  els.remaining.textContent = String(remaining);
  els.total.textContent = String(todos.length);

  const hasCompleted = todos.some((t) => t.completed);
  els.clearCompleted.disabled = !hasCompleted;

  const visible = filteredTodos();
  els.emptyState.hidden = visible.length !== 0;

  els.list.innerHTML = visible
    .map((t) => {
      const checked = t.completed ? "checked" : "";
      const titleClass = t.completed ? "title completed" : "title";
      const isEditing = editingId === t.id;

      const mainCell = isEditing
        ? `<input class="edit-input" data-edit="${escapeHtml(
            t.id,
          )}" value="${escapeHtml(editingDraft)}" maxlength="160" />`
        : `<span class="${titleClass}">${escapeHtml(t.text)}</span>`;

      const editLabel = isEditing ? "Save" : "Edit";
      const editAction = isEditing ? "save" : "edit";

      return `
        <li class="item" data-id="${escapeHtml(t.id)}">
          <input class="check" type="checkbox" ${checked} data-action="toggle" aria-label="Mark complete" />
          <div class="content">${mainCell}</div>
          <div class="actions" aria-label="Task actions">
            <button class="icon-btn" type="button" data-action="${editAction}">${editLabel}</button>
            <button class="icon-btn danger" type="button" data-action="delete" aria-label="Delete task">Delete</button>
          </div>
        </li>
      `;
    })
    .join("");

  if (after) after();
}

els.addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addTodo(els.newTodo.value);
  els.newTodo.value = "";
  els.newTodo.focus();
});

els.filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const f = btn.dataset.filter;
    if (f === "all" || f === "active" || f === "completed") setFilter(f);
  });
});

els.clearCompleted.addEventListener("click", clearCompleted);

els.list.addEventListener("click", (e) => {
  const target = /** @type {HTMLElement} */ (e.target);
  const li = target.closest("[data-id]");
  if (!li) return;
  const id = li.getAttribute("data-id");
  if (!id) return;

  const action = target.getAttribute("data-action");
  if (action === "toggle") toggleTodo(id);
  if (action === "delete") deleteTodo(id);
  if (action === "edit") startEdit(id);
  if (action === "save") commitEdit();
});

els.list.addEventListener("dblclick", (e) => {
  const target = /** @type {HTMLElement} */ (e.target);
  const li = target.closest("[data-id]");
  if (!li) return;
  const id = li.getAttribute("data-id");
  if (!id) return;
  startEdit(id);
});

els.list.addEventListener("input", (e) => {
  const target = /** @type {HTMLElement} */ (e.target);
  if (!(target instanceof HTMLInputElement)) return;
  const editId = target.getAttribute("data-edit");
  if (!editId) return;
  updateEditingDraft(target.value);
});

els.list.addEventListener("keydown", (e) => {
  const target = /** @type {HTMLElement} */ (e.target);
  if (!(target instanceof HTMLInputElement)) return;
  const editId = target.getAttribute("data-edit");
  if (!editId) return;
  if (e.key === "Enter") {
    e.preventDefault();
    commitEdit();
  }
  if (e.key === "Escape") {
    e.preventDefault();
    cancelEdit();
  }
});

render();
