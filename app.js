const STORAGE_KEY = "todo.items.v2";
const STORAGE_KEY_V1 = "todo.items.v1";

/** @typedef {"high"|"medium"|"low"} Priority */

/** @typedef {{
 *   id: string,
 *   text: string,
 *   completed: boolean,
 *   createdAt: number,
 *   priority: Priority,
 *   dueDate: number | null
 * }} Todo */

const PRIORITY_ORDER = /** @type {const} */ (["high", "medium", "low"]);
const PRIORITY_LABELS = { high: "High", medium: "Medium", low: "Low" };

/** @returns {string} */
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** @param {unknown} p @returns {p is Priority} */
function isPriority(p) {
  return p === "high" || p === "medium" || p === "low";
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
      typeof t.createdAt === "number" &&
      isPriority(t.priority) &&
      (t.dueDate === null || typeof t.dueDate === "number"),
  );
}

/** @param {unknown} value @returns {value is Array<{id:string,text:string,completed:boolean,createdAt:number}>} */
function isLegacyTodoArray(value) {
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

/** @param {ReturnType<typeof JSON.parse>[number]} t @returns {Todo} */
function migrateLegacyTodo(t) {
  return {
    id: t.id,
    text: t.text,
    completed: t.completed,
    createdAt: t.createdAt,
    priority: "medium",
    dueDate: null,
  };
}

/** @returns {Todo[]} */
function loadTodos() {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (isTodoArray(parsed)) return parsed;
    }

    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      if (isLegacyTodoArray(parsed)) {
        const migrated = parsed.map(migrateLegacyTodo);
        saveTodos(migrated);
        return migrated;
      }
    }
    return [];
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

/** @param {number|null} ts */
function formatDueDate(ts) {
  if (ts === null) return "";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** @param {number|null} ts @returns {string} */
function toDateInputValue(ts) {
  if (ts === null) return "";
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @param {string} value @returns {number|null} */
function parseDateInput(value) {
  if (!value) return null;
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** @param {number|null} dueDate @param {boolean} completed */
function isOverdue(dueDate, completed) {
  if (dueDate === null || completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today.getTime();
}

const ICONS = {
  pencil: `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  check: `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  trash: `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
  grip: `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`,
};

const els = {
  addForm: /** @type {HTMLFormElement} */ (document.getElementById("addForm")),
  newTodo: /** @type {HTMLInputElement} */ (document.getElementById("newTodo")),
  newPriority: /** @type {HTMLSelectElement} */ (document.getElementById("newPriority")),
  newDueDate: /** @type {HTMLInputElement} */ (document.getElementById("newDueDate")),
  searchInput: /** @type {HTMLInputElement} */ (document.getElementById("searchInput")),
  listScroll: /** @type {HTMLElement} */ (document.getElementById("listScroll")),
  list: /** @type {HTMLUListElement} */ (document.getElementById("todoList")),
  remaining: /** @type {HTMLElement} */ (document.getElementById("remainingCount")),
  total: /** @type {HTMLElement} */ (document.getElementById("totalCount")),
  clearCompleted: /** @type {HTMLButtonElement} */ (document.getElementById("clearCompleted")),
  emptyState: /** @type {HTMLElement} */ (document.getElementById("emptyState")),
  progressBar: /** @type {HTMLElement} */ (document.getElementById("progressBar")),
  progressFill: /** @type {HTMLElement} */ (document.getElementById("progressFill")),
  progressLabel: /** @type {HTMLElement} */ (document.getElementById("progressLabel")),
  filterButtons: /** @type {NodeListOf<HTMLButtonElement>} */ (
    document.querySelectorAll("[data-filter]")
  ),
};

/** @type {Todo[]} */
let todos = loadTodos();
/** @type {"all"|"active"|"completed"} */
let activeFilter = "all";
/** @type {string} */
let searchQuery = "";
/** @type {string|null} */
let editingId = null;
/** @type {string} */
let editingDraft = "";
/** @type {number|null} */
let editingDueDate = null;
/** @type {string|null} */
let lastAddedId = null;
/** @type {string|null} */
let pendingDeleteId = null;
/** @type {string|null} */
let justCompletedId = null;
/** @type {string|null} */
let draggingId = null;
/** @type {string|null} */
let dragOverId = null;

function canReorder() {
  return activeFilter === "all" && !searchQuery.trim() && draggingId === null;
}

function filteredTodos() {
  let result = todos;
  if (activeFilter === "active") result = result.filter((t) => !t.completed);
  else if (activeFilter === "completed") result = result.filter((t) => t.completed);

  const q = searchQuery.trim().toLowerCase();
  if (q) result = result.filter((t) => t.text.toLowerCase().includes(q));
  return result;
}

function setFilter(next) {
  activeFilter = next;
  els.filterButtons.forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.filter === next));
  });
  render();
}

/** @param {Priority} priority @param {number|null} dueDate */
function addTodo(text, priority, dueDate) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const id = uid();
  todos = [
    {
      id,
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
      priority,
      dueDate,
    },
    ...todos,
  ];
  lastAddedId = id;
  saveTodos(todos);
  render();
  setTimeout(() => {
    lastAddedId = null;
  }, 300);
}

/** @param {string} id */
function toggleTodo(id) {
  const t = todos.find((x) => x.id === id);
  if (!t) return;
  const nowCompleted = !t.completed;
  todos = todos.map((item) =>
    item.id === id ? { ...item, completed: nowCompleted } : item,
  );
  if (nowCompleted) justCompletedId = id;
  saveTodos(todos);
  render();
  setTimeout(() => {
    if (justCompletedId === id) justCompletedId = null;
  }, 350);
}

/** @param {string} id */
function requestDeleteTodo(id) {
  if (pendingDeleteId) return;
  pendingDeleteId = id;
  if (editingId === id) {
    editingId = null;
    editingDraft = "";
    editingDueDate = null;
  }
  render();
  setTimeout(() => {
    todos = todos.filter((t) => t.id !== id);
    pendingDeleteId = null;
    saveTodos(todos);
    render();
  }, 200);
}

/** @param {Priority} priority */
function nextPriority(priority) {
  const i = PRIORITY_ORDER.indexOf(priority);
  return PRIORITY_ORDER[(i + 1) % PRIORITY_ORDER.length];
}

/** @param {string} id */
function cyclePriority(id) {
  todos = todos.map((t) =>
    t.id === id ? { ...t, priority: nextPriority(t.priority) } : t,
  );
  saveTodos(todos);
  render();
}

/** @param {string} fromId @param {string} toId */
function reorderTodos(fromId, toId) {
  if (fromId === toId) return;
  const fromIndex = todos.findIndex((t) => t.id === fromId);
  const toIndex = todos.findIndex((t) => t.id === toId);
  if (fromIndex === -1 || toIndex === -1) return;

  const next = [...todos];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  todos = next;
  saveTodos(todos);
  render();
}

/** @param {string} id */
function startEdit(id) {
  const t = todos.find((x) => x.id === id);
  if (!t) return;
  editingId = id;
  editingDraft = t.text;
  editingDueDate = t.dueDate;
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
  editingDueDate = null;
  render();
}

/** @param {string} nextText */
function updateEditingDraft(nextText) {
  editingDraft = nextText;
}

/** @param {number|null} dueDate */
function updateEditingDueDate(dueDate) {
  editingDueDate = dueDate;
}

function commitEdit() {
  if (!editingId) return;
  const nextText = editingDraft.trim();
  if (!nextText) {
    requestDeleteTodo(editingId);
    return;
  }
  todos = todos.map((t) =>
    t.id === editingId ? { ...t, text: nextText, dueDate: editingDueDate } : t,
  );
  editingId = null;
  editingDraft = "";
  editingDueDate = null;
  saveTodos(todos);
  render();
}

function clearCompleted() {
  const before = todos.length;
  todos = todos.filter((t) => !t.completed);
  if (todos.length !== before) saveTodos(todos);
  render();
}

/** @param {Todo} t */
function renderItem(t) {
  const checked = t.completed ? "checked" : "";
  const titleClass = t.completed ? "title completed" : "title";
  const isEditing = editingId === t.id;
  const reorderEnabled = canReorder();
  const isPendingDelete = pendingDeleteId === t.id;

  let itemClasses = "item";
  if (lastAddedId === t.id) itemClasses += " item-enter";
  if (isPendingDelete) itemClasses += " item-exit";
  if (justCompletedId === t.id) itemClasses += " item-complete";
  if (draggingId === t.id) itemClasses += " dragging";
  if (dragOverId === t.id && draggingId !== t.id) itemClasses += " drag-over";

  const draggable = reorderEnabled ? 'draggable="true"' : "";

  const gripCell = reorderEnabled
    ? `<span class="drag-handle" title="Drag to reorder" aria-hidden="true">${ICONS.grip}</span>`
    : `<span class="drag-handle drag-handle-disabled" title="Clear search and filters to reorder" aria-hidden="true">${ICONS.grip}</span>`;

  const priorityLabel = PRIORITY_LABELS[t.priority];
  const priorityDot = `<button type="button" class="priority-dot priority-${t.priority}" data-action="cycle-priority" aria-label="Priority: ${priorityLabel}. Click to change."></button>`;

  let mainCell;
  if (isEditing) {
    mainCell = `
      <input class="edit-input" data-edit="${escapeHtml(t.id)}" value="${escapeHtml(editingDraft)}" maxlength="160" />
      <input class="edit-date" type="date" data-due-edit="${escapeHtml(t.id)}" value="${escapeHtml(toDateInputValue(editingDueDate))}" aria-label="Due date" />
    `;
  } else {
    const dueBadge =
      t.dueDate !== null
        ? `<span class="due-badge${isOverdue(t.dueDate, t.completed) ? " overdue" : ""}">${escapeHtml(formatDueDate(t.dueDate))}</span>`
        : "";
    mainCell = `<span class="${titleClass}">${escapeHtml(t.text)}</span>${dueBadge}`;
  }

  const editIcon = isEditing ? ICONS.check : ICONS.pencil;
  const editAction = isEditing ? "save" : "edit";
  const editLabel = isEditing ? "Save task" : "Edit task";

  return `
    <li class="${itemClasses}" data-id="${escapeHtml(t.id)}" ${draggable}>
      ${gripCell}
      ${priorityDot}
      <input class="check" type="checkbox" ${checked} data-action="toggle" aria-label="Mark complete" />
      <div class="content">${mainCell}</div>
      <div class="actions" aria-label="Task actions">
        <button class="icon-btn" type="button" data-action="${editAction}" aria-label="${editLabel}">${editIcon}</button>
        <button class="icon-btn danger" type="button" data-action="delete" aria-label="Delete task">${ICONS.trash}</button>
      </div>
    </li>
  `;
}

/** @param {() => void} [after] */
function render(after) {
  const scrollTop = els.listScroll.scrollTop;
  const remaining = todos.filter((t) => !t.completed).length;
  const total = todos.length;
  const completed = total - remaining;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  els.remaining.textContent = String(remaining);
  els.total.textContent = String(total);

  els.progressBar.setAttribute("aria-valuenow", String(pct));
  els.progressFill.style.width = `${pct}%`;
  els.progressLabel.textContent =
    total === 0 ? "No tasks yet" : `${completed} of ${total} completed`;

  const hasCompleted = todos.some((t) => t.completed);
  els.clearCompleted.disabled = !hasCompleted;

  const visible = filteredTodos();
  els.emptyState.hidden = visible.length !== 0;

  if (draggingId === null) {
    els.list.innerHTML = visible.map(renderItem).join("");
  }

  els.listScroll.scrollTop = scrollTop;
  if (after) after();
}

els.addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const priority = /** @type {Priority} */ (els.newPriority.value);
  const dueDate = parseDateInput(els.newDueDate.value);
  addTodo(els.newTodo.value, priority, dueDate);
  els.newTodo.value = "";
  els.newDueDate.value = "";
  els.newPriority.value = "medium";
  els.newTodo.focus();
});

els.searchInput.addEventListener("input", () => {
  searchQuery = els.searchInput.value;
  render();
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
  const actionEl = target.closest("[data-action]");
  const li = target.closest("[data-id]");
  if (!li) return;
  const id = li.getAttribute("data-id");
  if (!id) return;

  const action = actionEl?.getAttribute("data-action");
  if (action === "toggle") toggleTodo(id);
  if (action === "delete") requestDeleteTodo(id);
  if (action === "edit") startEdit(id);
  if (action === "save") commitEdit();
  if (action === "cycle-priority") cyclePriority(id);
});

els.list.addEventListener("dblclick", (e) => {
  const target = /** @type {HTMLElement} */ (e.target);
  if (target.closest(".drag-handle, .priority-dot, .icon-btn, .check")) return;
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
  if (editId) {
    updateEditingDraft(target.value);
    return;
  }

  const dueEditId = target.getAttribute("data-due-edit");
  if (dueEditId) {
    updateEditingDueDate(parseDateInput(target.value));
  }
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

els.list.addEventListener("dragstart", (e) => {
  if (!canReorder()) {
    e.preventDefault();
    return;
  }
  const target = /** @type {HTMLElement} */ (e.target);
  const li = target.closest("[data-id]");
  if (!li) {
    e.preventDefault();
    return;
  }
  const id = li.getAttribute("data-id");
  if (!id) {
    e.preventDefault();
    return;
  }
  draggingId = id;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }
  li.classList.add("dragging");
});

els.list.addEventListener("dragover", (e) => {
  if (!draggingId) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

  const target = /** @type {HTMLElement} */ (e.target);
  const li = target.closest("[data-id]");
  if (!li) return;
  const id = li.getAttribute("data-id");
  if (!id || id === draggingId) return;

  if (dragOverId !== id) {
    dragOverId = id;
    els.list.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
    li.classList.add("drag-over");
  }
});

els.list.addEventListener("drop", (e) => {
  e.preventDefault();
  const target = /** @type {HTMLElement} */ (e.target);
  const li = target.closest("[data-id]");
  const fromId = draggingId;
  draggingId = null;
  dragOverId = null;
  if (!li || !fromId) return;
  const toId = li.getAttribute("data-id");
  if (toId) reorderTodos(fromId, toId);
});

els.list.addEventListener("dragend", () => {
  draggingId = null;
  dragOverId = null;
  els.list.querySelectorAll(".dragging, .drag-over").forEach((el) => {
    el.classList.remove("dragging", "drag-over");
  });
  render();
});

render();
