// ==========================================
// STUDYTASK MANAGER — script.js
// ==========================================


// ==========================================
// DOM REFERENCES
// ==========================================

const taskForm        = document.getElementById("taskForm");
const taskTitle       = document.getElementById("taskTitle");
const taskSubject     = document.getElementById("taskSubject");
const taskDate        = document.getElementById("taskDate");
const taskPriority    = document.getElementById("taskPriority");
const taskDescription = document.getElementById("taskDescription");
const taskList        = document.getElementById("taskList");
const emptyMessage    = document.getElementById("emptyMessage");
const searchInput     = document.getElementById("searchInput");
const statusFilter    = document.getElementById("statusFilter");
const subjectFilter   = document.getElementById("subjectFilter");
const totalTasksEl    = document.getElementById("totalTasks");
const pendingTasksEl  = document.getElementById("pendingTasks");
const completedTasksEl= document.getElementById("completedTasks");
const todayTasksEl    = document.getElementById("todayTasks");
const themeBtn        = document.getElementById("themeBtn");


// ==========================================
// STATE
// ==========================================

let tasks = (function () {
    try {
        return JSON.parse(localStorage.getItem("studyTasks")) || [];
    } catch (e) {
        console.warn("studyTasks localStorage data was corrupted and has been reset.", e);
        localStorage.removeItem("studyTasks");
        return [];
    }
}());


// ==========================================
// PERSISTENCE
// ==========================================

function saveTasks() {
    localStorage.setItem("studyTasks", JSON.stringify(tasks));
}

function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}


// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================

// Inject toast container once
const toastContainer = document.createElement("div");
toastContainer.className = "toast-container";
document.body.appendChild(toastContainer);

/**
 * Show a toast message.
 * @param {string} message
 * @param {"success"|"error"|"info"} type
 */
function showToast(message, type = "success") {
    const icons = { success: "✅", error: "❌", info: "ℹ️" };

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]}</span> ${escapeHTML(message)}`;

    toastContainer.appendChild(toast);

    // Auto-remove after 3 s
    setTimeout(() => {
        toast.classList.add("hide");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }, 3000);
}


// ==========================================
// CONFIRM DIALOG (replaces window.confirm)
// ==========================================

/**
 * Show a styled confirm dialog.
 * Returns a Promise that resolves to true/false.
 * @param {string} message
 */
function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "confirm-overlay";
        overlay.innerHTML = `
            <div class="confirm-box">
                <div class="confirm-icon">🗑️</div>
                <h3>Delete Task?</h3>
                <p>${escapeHTML(message)}</p>
                <div class="confirm-actions">
                    <button class="cancel-btn" id="confirmNo">Cancel</button>
                    <button class="confirm-yes" id="confirmYes">Delete</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector("#confirmYes").addEventListener("click", () => {
            overlay.remove();
            resolve(true);
        });

        overlay.querySelector("#confirmNo").addEventListener("click", () => {
            overlay.remove();
            resolve(false);
        });

        // Close on backdrop click
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) { overlay.remove(); resolve(false); }
        });
    });
}


// ==========================================
// EDIT MODAL (replaces prompt)
// ==========================================

/**
 * Open a full edit modal for the given task.
 * @param {object} task
 */
function openEditModal(task) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal">
            <h3>✏️ Edit Task</h3>

            <div class="form-group">
                <label for="editTitle">Task Title</label>
                <input type="text" id="editTitle" value="${escapeHTML(task.title)}" required>
            </div>

            <div class="form-group">
                <label for="editSubject">Subject</label>
                <select id="editSubject">
                    ${["Java","JavaScript","HTML","CSS","Database","Python","Other"]
                        .map(s => `<option value="${s}"${task.subject === s ? " selected" : ""}>${s}</option>`)
                        .join("")}
                </select>
            </div>

            <div class="form-group">
                <label for="editDate">Due Date</label>
                <input type="date" id="editDate" value="${escapeHTML(task.date)}">
            </div>

            <div class="form-group">
                <label for="editPriority">Priority</label>
                <select id="editPriority">
                    ${["High","Medium","Low"]
                        .map(p => `<option value="${p}"${task.priority === p ? " selected" : ""}>${p}</option>`)
                        .join("")}
                </select>
            </div>

            <div class="form-group">
                <label for="editDescription">Description</label>
                <textarea id="editDescription" rows="3">${escapeHTML(task.description)}</textarea>
            </div>

            <div class="modal-actions">
                <button class="cancel-btn" id="editCancel">Cancel</button>
                <button class="primary-btn" id="editSave">Save Changes</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
        overlay.classList.add("hide");
        overlay.addEventListener("animationend", () => overlay.remove(), { once: true });
    };

    overlay.querySelector("#editCancel").addEventListener("click", close);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });

    overlay.querySelector("#editSave").addEventListener("click", () => {
        const newTitle = overlay.querySelector("#editTitle").value.trim();

        if (!newTitle) {
            showToast("Task title cannot be empty.", "error");
            return;
        }

        task.title       = newTitle;
        task.subject     = overlay.querySelector("#editSubject").value;
        task.date        = overlay.querySelector("#editDate").value;
        task.priority    = overlay.querySelector("#editPriority").value;
        task.description = overlay.querySelector("#editDescription").value.trim();

        saveTasks();
        displayTasks();
        updateDashboard();
        close();
        showToast("Task updated successfully!", "success");
    });
}


// ==========================================
// ADD TASK
// ==========================================

taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const newTask = {
        id:          generateId(),
        title:       taskTitle.value.trim(),
        subject:     taskSubject.value,
        date:        taskDate.value,
        priority:    taskPriority.value,
        description: taskDescription.value.trim(),
        completed:   false,
        createdAt:   Date.now()
    };

    tasks.push(newTask);
    saveTasks();
    taskForm.reset();
    displayTasks();
    updateDashboard();

    showToast("Task added successfully! 🎉", "success");

    // Scroll to task list
    document.getElementById("tasks").scrollIntoView({ behavior: "smooth", block: "start" });
});


// ==========================================
// DISPLAY TASKS
// ==========================================

function displayTasks() {
    const searchText     = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value;
    const selectedSubject= subjectFilter.value;
    const today          = getTodayString();

    // Filter
    const filtered = tasks.filter((task) => {
        const title       = (task.title       || "").toLowerCase();
        const subject     = (task.subject     || "").toLowerCase();
        const description = (task.description || "").toLowerCase();

        const matchesSearch =
            title.includes(searchText) ||
            subject.includes(searchText) ||
            description.includes(searchText);

        const matchesStatus =
            selectedStatus === "All" ||
            (selectedStatus === "Pending"   && !task.completed) ||
            (selectedStatus === "Completed" &&  task.completed);

        const matchesSubject =
            selectedSubject === "All" || task.subject === selectedSubject;

        return matchesSearch && matchesStatus && matchesSubject;
    });

    // Sort: pending first, then by due date ascending
    filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
    });

    taskList.innerHTML = "";

    if (filtered.length === 0) {
        emptyMessage.style.display = "block";
        return;
    }

    emptyMessage.style.display = "none";

    filtered.forEach((task) => {
        const isOverdue = !task.completed && task.date && task.date < today;
        const priorityClass = getPriorityClass(task.priority);

        const el = document.createElement("div");
        el.className = "task" +
            (task.completed ? " completed" : "") +
            (isOverdue      ? " overdue"   : "");

        el.innerHTML = `
            <div class="task-header">
                <div style="flex:1; min-width:0;">
                    <div class="task-title">${escapeHTML(task.title)}</div>
                    <div class="task-description">
                        ${escapeHTML(task.description || "No description provided.")}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="complete-btn" onclick="toggleTask(${task.id})">
                        ${task.completed ? "↩ Pending" : "✓ Complete"}
                    </button>
                    <button class="edit-btn" onclick="editTask(${task.id})">
                        ✏ Edit
                    </button>
                    <button class="delete-btn" onclick="deleteTask(${task.id})">
                        🗑 Delete
                    </button>
                </div>
            </div>
            <div class="task-info">
                <span class="badge subject-badge">📖 ${escapeHTML(task.subject)}</span>
                <span class="badge ${priorityClass}">${getPriorityIcon(task.priority)} ${escapeHTML(task.priority)}</span>
                <span class="badge ${isOverdue ? "overdue-badge" : "date-badge"}">
                    ${isOverdue ? "⚠️ Overdue · " : "📅 "}${formatDate(task.date)}
                </span>
            </div>
        `;

        taskList.appendChild(el);
    });
}


// ==========================================
// HELPERS
// ==========================================

function getTodayString() {
    return new Date().toISOString().split("T")[0];
}

function getPriorityClass(priority) {
    const map = { High: "priority-high", Medium: "priority-medium", Low: "priority-low" };
    return map[priority] || "priority-low";
}

function getPriorityIcon(priority) {
    const map = { High: "🔴", Medium: "🟡", Low: "🟢" };
    return map[priority] || "";
}

function formatDate(date) {
    if (!date) return "No date";
    const [y, m, d] = date.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function escapeHTML(value) {
    if (!value) return "";
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}


// ==========================================
// TOGGLE COMPLETE / PENDING
// ==========================================

function toggleTask(id) {
    tasks = tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks();
    displayTasks();
    updateDashboard();

    const task = tasks.find(t => t.id === id);
    if (task) {
        showToast(
            task.completed ? "Task marked as complete! ✅" : "Task moved back to pending.",
            task.completed ? "success" : "info"
        );
    }
}


// ==========================================
// DELETE TASK
// ==========================================

async function deleteTask(id) {
    const confirmed = await showConfirm("This action cannot be undone.");
    if (!confirmed) return;

    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    displayTasks();
    updateDashboard();
    showToast("Task deleted.", "error");
}


// ==========================================
// EDIT TASK
// ==========================================

function editTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    openEditModal(task);
}


// ==========================================
// DASHBOARD STATISTICS + PROGRESS BAR
// ==========================================

function updateDashboard() {
    const total     = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending   = total - completed;
    const today     = getTodayString();
    const todayCount= tasks.filter(t => t.date === today).length;

    totalTasksEl.textContent     = total;
    pendingTasksEl.textContent   = pending;
    completedTasksEl.textContent = completed;
    todayTasksEl.textContent     = todayCount;

    // Progress bar in welcome banner
    updateProgressBar(total, completed);
}

function updateProgressBar(total, completed) {
    // Create or find progress bar elements
    let progressWrap = document.querySelector(".progress-wrap");

    if (!progressWrap) {
        progressWrap = document.createElement("div");
        progressWrap.className = "progress-wrap";
        progressWrap.innerHTML = `
            <div class="progress-label">
                <span id="progressText">Task completion</span>
                <span id="progressPercent">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
        `;
        const welcome = document.querySelector(".welcome");
        if (welcome) welcome.appendChild(progressWrap);
    }

    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    const fill    = document.getElementById("progressFill");
    const pctText = document.getElementById("progressPercent");

    if (fill)    fill.style.width   = pct + "%";
    if (pctText) pctText.textContent = pct + "%";
}


// ==========================================
// SEARCH (debounced)
// ==========================================

let searchDebounce;
searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(displayTasks, 200);
});


// ==========================================
// FILTERS
// ==========================================

statusFilter.addEventListener("change",  displayTasks);
subjectFilter.addEventListener("change", displayTasks);


// ==========================================
// DARK MODE
// ==========================================

themeBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", isDark);
    themeBtn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
});

// Restore saved theme
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️ Light";
}


// ==========================================
// INIT
// ==========================================

displayTasks();
updateDashboard();
