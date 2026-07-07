const API_URL ="http://localhost/Exam/backend/api.php";
let users = [];
let halls = [];
let duties = [];




document.addEventListener("DOMContentLoaded", function () {
    const userForm = document.getElementById("userForm");
    const hallForm = document.getElementById("hallForm");
    const editHallForm = document.getElementById("editHallForm");
    const dutyForm = document.getElementById("dutyForm");
    const uRole = document.getElementById("uRole");

    if (userForm) userForm.addEventListener("submit", saveUser);
    if (hallForm) hallForm.addEventListener("submit", saveHall);
    if (editHallForm) editHallForm.addEventListener("submit", updateHall);
    if (dutyForm) dutyForm.addEventListener("submit", saveDuty);
    if (uRole) uRole.addEventListener("change", updatePlaceholder);

    loadAllData();
});

async function loadAllData() {
    const statusDot = document.getElementById("dbStatusDot");
    const statusText = document.getElementById("dbStatusText");
    const statusIndicator = document.getElementById("dbStatusIndicator");

    try {
        const userRes = await fetch(`${API_URL}?action=getUsers`, { cache: "no-store" });
        users = await userRes.json();
        renderUsers();

        const hallRes = await fetch(`${API_URL}?action=getHalls`, { cache: "no-store" });
        halls = await hallRes.json();
        renderHalls();

        const dutyRes = await fetch(`${API_URL}?action=getDuties`, { cache: "no-store" });
        duties = await dutyRes.json();
        renderDuties();

        // STATE PRESERVATION: Check if a saved seat plan exists on page load/refresh
        checkSavedSeatingPlan();

        if (statusDot) statusDot.style.background = "#0d9488";
        if (statusIndicator) statusIndicator.style.background = "#ccfbf1";
        if (statusText) {
            statusText.style.color = "#0d9488";
            statusText.innerText = "Connected to MySQL";
        }
    } catch (err) {
        if (statusDot) statusDot.style.background = "#ef4444";
        if (statusIndicator) statusIndicator.style.background = "#fee2e2";
        if (statusText) {
            statusText.style.color = "#ef4444";
            statusText.innerText = "Connection Failed";
        }
        console.error("Data Syncing Error:", err);
    }
}

function switchTab(event, tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
    document.getElementById('currentTabTitle').innerText = event.currentTarget.innerText;

    if (tabId === 'invigilation') refreshDutyDropdowns();
}

function openUserModal() { document.getElementById('userModal').classList.remove('hidden'); }
function closeUserModal() { document.getElementById('userModal').classList.add('hidden'); }
function openBulkModal() { document.getElementById('bulkModal').classList.remove('hidden'); }
function closeBulkModal() { document.getElementById('bulkModal').classList.add('hidden'); }
function openHallModal() { document.getElementById('hallModal').classList.remove('hidden'); }
function closeHallModal() { document.getElementById('hallModal').classList.add('hidden'); }
function openEditHallModal(room, capacity) {
    document.getElementById('editHRoom').value = room;
    document.getElementById('editHCap').value = capacity;
    document.getElementById('editHallModal').classList.remove('hidden');
}
function closeEditHallModal() { document.getElementById('editHallModal').classList.add('hidden'); }

function updatePlaceholder() {
    const role = document.getElementById('uRole').value;
    document.getElementById('idLabel').innerText = role === 'student' ? 'Student ID' : 'Email Address';
}

window.triggerEditHall = function(room, capacity) {
    openEditHallModal(room, capacity);
}

// Helper to check and render saved plans from localStorage
function checkSavedSeatingPlan() {
    const savedPlanHTML = localStorage.getItem("examshield_saved_seating");
    const resultContainer = document.getElementById('seatingResult');
    if (savedPlanHTML && resultContainer) {
        resultContainer.classList.remove('hidden');
        resultContainer.innerHTML = savedPlanHTML;
    }
}

// Helper to invalidate seating plan when new data comes in
function invalidateSeatingPlanCache() {
    localStorage.removeItem("examshield_saved_seating");
    const resultContainer = document.getElementById('seatingResult');
    if (resultContainer) {
        resultContainer.classList.add('hidden');
        resultContainer.innerHTML = "";
    }
}

// --- ALLOCATION ENGINE WITH PERSISTENT STATE STORAGE ---
function runAllocationEngine() {
    const students = users.filter(u => u.role === 'student' && u.dept);
    if (students.length === 0 || halls.length === 0) {
        return alert("Requires loaded students with departments and configured halls.");
    }

    let pLeft = students.filter(s => s.dept === 'CSE');
    let pRight = students.filter(s => s.dept !== 'CSE');

    let html = "";
    let lIdx = 0, rIdx = 0, bench = 1;

    for (let h = 0; h < halls.length; h++) {
        let roomBenches = Math.floor(parseInt(halls[h].capacity) / 2);
        for (let b = 0; b < roomBenches; b++) {
            if (lIdx >= pLeft.length && rIdx >= pRight.length) break;

            let sL = pLeft[lIdx++] || null;
            let sR = pRight[rIdx++] || null;

            html += `
                <tr>
                    <td><strong>Desk ${bench++}</strong></td>
                    <td>${sL ? `${sL.name} (${sL.dept})` : '-'}</td>
                    <td>${sR ? `${sR.name} (${sR.dept})` : '-'}</td>
                    <td>Room ${halls[h].room}</td>
                </tr>
            `;
        }
    }

    const resultContainer = document.getElementById('seatingResult');
    if (resultContainer) {
        const structuralHTML = `
            <table class="admin-table" style="margin-top:20px;">
                <thead><tr><th>Desk</th><th>Left Seat (CSE)</th><th>Right Seat (Non-CSE)</th><th>Room</th></tr></thead>
                <tbody>${html}</tbody>
            </table>
        `;
        resultContainer.classList.remove('hidden');
        resultContainer.innerHTML = structuralHTML;
        
        // Save the generated table structure to local storage permanently until new modification occurs
        localStorage.setItem("examshield_saved_seating", structuralHTML);
    }
}

// --- RENDERING TEMPLATES ---
function renderUsers() {
    const body = document.getElementById('profilesTableBody');
    if (!body) return;
    body.innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.name}</td>
            <td>${u.role ? u.role.toUpperCase() : ''}</td>
            <td>${u.dept || '-'}</td>
            <td>
                <form action="${API_URL}" method="POST" onsubmit="return confirm('Permanently delete user with ID: ${u.id}?');" style="display:inline;">
                    <input type="hidden" name="action" value="deleteUser">
                    <input type="hidden" name="id" value="${u.id}">
                    <button type="submit" class="table-action-btn" style="color: #ef4444; background:none; border:none; cursor:pointer;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </form>
            </td>
        </tr>
    `).join('');
}

function renderHalls() {
    const grid = document.getElementById('hallsGridContainer');
    if (!grid) return;
    grid.innerHTML = halls.map(h => `
        <div class="hall-card">
            <h4>Room ${h.room}</h4>
            <p>Capacity: ${h.capacity} Seats</p>
            <div class="hall-controls-footer">
                <button type="button" class="btn-card-edit" onclick="triggerEditHall('${h.room}', '${h.capacity}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <form action="${API_URL}" method="POST" onsubmit="return confirm('Permanently remove Room ${h.room}?');" style="display:inline;">
                    <input type="hidden" name="action" value="deleteHall">
                    <input type="hidden" name="room" value="${h.room}">
                    <button type="submit" class="btn-card-delete" style="cursor:pointer;">
                        <i class="fas fa-trash"></i> Drop
                    </button>
                </form>
            </div>
        </div>
    `).join('');
}

function renderDuties() {
    const body = document.getElementById('dutyTableBody');
    if (!body) return;
    body.innerHTML = duties.map(d => `
        <tr>
            <td>${d.teacher_name}</td>
            <td>Room ${d.room_number}</td>
            <td><span class="status-assigned-tag">${d.status || 'Assigned'}</span></td>
            <td>
                <form action="${API_URL}" method="POST" onsubmit="return confirm('Revoke this duty assignment?');" style="display:inline;">
                    <input type="hidden" name="action" value="deleteDuty">
                    <input type="hidden" name="id" value="${d.id}">
                    <button type="submit" class="table-action-btn" style="color: #ef4444; background:none; border:none; cursor:pointer;">
                        <i class="fas fa-user-minus"></i>
                    </button>
                </form>
            </td>
        </tr>
    `).join('');
}

// --- DATA MANIPULATION SUBMISSIONS ---
async function saveUser(e) {
    e.preventDefault();
    const payload = {
        id: document.getElementById('uID').value,
        name: document.getElementById('uName').value,
        role: document.getElementById('uRole').value,
        dept: document.getElementById('uDept').value
    };
    await fetch(`${API_URL}?action=saveUser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    closeUserModal();
    document.getElementById("userForm").reset();
    
    // NEW DATA RECEIVED: Clear current seating layout forcing recalculation tracking
    invalidateSeatingPlanCache();
    loadAllData();
}

async function processBulkCSV() {
    const rawText = document.getElementById('csvPasteArea').value.trim();
    if (!rawText) return alert("Paste clean values first.");

    const lines = rawText.split('\n');
    let parsedStudents = [];

    lines.forEach(line => {
        if (!line.trim()) return;
        const col = line.split(',');
        if (col.length >= 3) {
            parsedStudents.push({
                id: col[0].trim(),
                name: col[1].trim(),
                dept: col[2].trim().toUpperCase()
            });
        }
    });

    if (parsedStudents.length > 0) {
        await fetch(`${API_URL}?action=saveBulkUsers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ students: parsedStudents })
        });
        closeBulkModal();
        document.getElementById('csvPasteArea').value = "";
        
        // NEW DATA RECEIVED: Reset seating state container layout
        invalidateSeatingPlanCache();
        loadAllData();
    } else {
        alert("Invalid CSV format. Use: ID,Name,Department");
    }
}

async function saveHall(e) {
    e.preventDefault();
    const payload = { room: document.getElementById('hRoom').value, capacity: document.getElementById('hCap').value };
    await fetch(`${API_URL}?action=saveHall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    closeHallModal();
    document.getElementById("hallForm").reset();
    
    // NEW DATA RECEIVED: Reset allocation data
    invalidateSeatingPlanCache();
    loadAllData();
}

async function saveDuty(e) {
    e.preventDefault();
    const payload = { teacher_name: document.getElementById('dutyTeacher').value, room_number: document.getElementById('dutyHall').value };
    await fetch(`${API_URL}?action=saveDuty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    document.getElementById("dutyForm").reset();
    loadAllData();
}

async function updateHall(e) {
    e.preventDefault();
    const room = document.getElementById('editHRoom').value;
    const capacity = document.getElementById('editHCap').value;
    await fetch(`${API_URL}?action=updateHall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, capacity })
    });
    closeEditHallModal();
    
    // DATA AMENDED: Invalidate seating structure plan cache
    invalidateSeatingPlanCache();
    loadAllData();
}

async function wipeAllStudents() {
    if (!confirm("Wipe all students?")) return;
    await fetch(`${API_URL}?action=wipeStudents`, { method: "POST" });
    invalidateSeatingPlanCache();
    loadAllData();
}

function refreshDutyDropdowns() {
    const tSelect = document.getElementById('dutyTeacher');
    const hSelect = document.getElementById('dutyHall');
    if (tSelect) tSelect.innerHTML = users.filter(u => u.role === 'teacher').map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    if (hSelect) hSelect.innerHTML = halls.map(h => `<option value="${h.room}">${h.room}</option>`).join('');
}



//////




// --- GLOBAL DELEGATED CLICK LISTENER FOR DELETIONS ---
document.body.addEventListener("click", async function (event) {
    
    // =========================================================
    // A. DELETE USER ACTION
    // =========================================================
    const deleteUserBtn = event.target.closest(".action-delete-user");
    if (deleteUserBtn) {
        event.preventDefault();
        const userId = deleteUserBtn.getAttribute("data-id");
        
        if (confirm(`Are you sure you want to permanently delete user ID: ${userId}?`)) {
            try {
                const response = await fetch(`${API_URL}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "deleteUser", id: userId })
                });
                const data = await response.json();
                if (data.status === "success") {
                    alert("User deleted successfully!");
                    loadAllData(); // Refresh your dashboard tables automatically
                } else {
                    alert("Error: " + data.message);
                }
            } catch (error) {
                console.error("Delete user failed:", error);
                alert("Could not connect to API server.");
            }
        }
        return;
    }

    // =========================================================
    // B. DELETE HALL CONFIGURATION ACTION
    // =========================================================
    const deleteHallBtn = event.target.closest(".action-delete-hall");
    if (deleteHallBtn) {
        event.preventDefault();
        const roomName = deleteHallBtn.getAttribute("data-room");
        
        if (confirm(`Are you sure you want to permanently delete Room: ${roomName}?`)) {
            try {
                const response = await fetch(`${API_URL}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "deleteHall", room: roomName })
                });
                const data = await response.json();
                if (data.status === "success") {
                    alert("Hall configuration deleted successfully!");
                    loadAllData(); // Refresh tables
                } else {
                    alert("Error: " + data.message);
                }
            } catch (error) {
                console.error("Delete hall failed:", error);
                alert("Could not connect to API server.");
            }
        }
        return;
    }

    // =========================================================
    // C. DELETE INVIGILATION DUTY ACTION
    // =========================================================
    const deleteDutyBtn = event.target.closest(".action-delete-duty");
    if (deleteDutyBtn) {
        event.preventDefault();
        const dutyId = deleteDutyBtn.getAttribute("data-id");
        
        if (confirm(`Are you sure you want to remove this invigilation duty assignment?`)) {
            try {
                const response = await fetch(`${API_URL}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "deleteDuty", id: dutyId })
                });
                const data = await response.json();
                if (data.status === "success") {
                    alert("Duty assignment deleted successfully!");
                    loadAllData(); // Refresh tables
                } else {
                    alert("Error: " + data.message);
                }
            } catch (error) {
                console.error("Delete duty failed:", error);
                alert("Could not connect to API server.");
            }
        }
        return;
    }
});
