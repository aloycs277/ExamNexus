let users = [];
let halls = [];
let duties = [];

function ensureSupabaseClient() {
    const client = window.supabaseClient || window.supabase;
    if (!client) {
        alert('Supabase is not configured yet. Update frontend/supabase-config.js.');
        return false;
    }
    window.supabase = client;
    return true;
}

document.addEventListener('DOMContentLoaded', function () {
    const userForm = document.getElementById('userForm');
    const hallForm = document.getElementById('hallForm');
    const editHallForm = document.getElementById('editHallForm');
    const dutyForm = document.getElementById('dutyForm');
    const uRole = document.getElementById('uRole');

    if (userForm) userForm.addEventListener('submit', saveUser);
    if (hallForm) hallForm.addEventListener('submit', saveHall);
    if (editHallForm) editHallForm.addEventListener('submit', updateHall);
    if (dutyForm) dutyForm.addEventListener('submit', saveDuty);
    if (uRole) uRole.addEventListener('change', updatePlaceholder);

    loadAllData();
});

async function loadAllData() {
    if (!ensureSupabaseClient()) return;

    const statusDot = document.getElementById('dbStatusDot');
    const statusText = document.getElementById('dbStatusText');
    const statusIndicator = document.getElementById('dbStatusIndicator');

    try {
        const { data: usersData, error: usersError } = await window.supabase
            .from('users')
            .select('id,name,role,dept')
            .order('name');
        if (usersError) throw usersError;
        users = usersData || [];
        renderUsers();

        const { data: hallsData, error: hallsError } = await window.supabase
            .from('halls')
            .select('*')
            .order('room_number');
        if (hallsError) throw hallsError;
        halls = hallsData || [];
        renderHalls();

        const { data: dutiesData, error: dutiesError } = await window.supabase
            .from('duties')
            .select('*')
            .order('duty_date');
        if (dutiesError) throw dutiesError;
        duties = dutiesData || [];
        renderDuties();

        if (statusDot) statusDot.style.background = '#0d9488';
        if (statusIndicator) statusIndicator.style.background = '#ccfbf1';
        if (statusText) {
            statusText.style.color = '#0d9488';
            statusText.innerText = 'Connected to Supabase';
        }
        refreshDutyDropdowns();
    } catch (err) {
        if (statusDot) statusDot.style.background = '#ef4444';
        if (statusIndicator) statusIndicator.style.background = '#fee2e2';
        if (statusText) {
            statusText.style.color = '#ef4444';
            statusText.innerText = 'Connection Failed';
        }
        console.error('Data Syncing Error:', err);
    }
}

function switchTab(event, tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
        const titleContainer = document.getElementById('currentTabTitle');
        if (titleContainer) titleContainer.innerText = event.currentTarget.innerText;
    }

    if (tabId === 'invigilation') refreshDutyDropdowns();
}

function openUserModal() { document.getElementById('userModal').classList.remove('hidden'); }
function closeUserModal() { document.getElementById('userModal').classList.add('hidden'); }
function openBulkModal() { document.getElementById('bulkModal').classList.remove('hidden'); }
function closeBulkModal() { document.getElementById('bulkModal').classList.add('hidden'); }
function openHallModal() { document.getElementById('hallModal').classList.remove('hidden'); }
function closeHallModal() { document.getElementById('hallModal').classList.add('hidden'); }

function updatePlaceholder() {
    const roleElem = document.getElementById('uRole');
    const labelElem = document.getElementById('idLabel');
    if (roleElem && labelElem) {
        labelElem.innerText = roleElem.value === 'student' ? 'Student ID' : 'Email Address';
    }
}

async function saveUser(e) {
    e.preventDefault();
    if (!ensureSupabaseClient()) return;

    const payload = {
        id: document.getElementById('uID').value.trim(),
        name: document.getElementById('uName').value.trim(),
        role: document.getElementById('uRole').value,
        dept: document.getElementById('uDept').value,
        email: `${document.getElementById('uID').value.trim()}@metrouni.edu.bd`,
        password: 'temp123'
    };

    const { error } = await window.supabase.from('users').upsert([payload], { onConflict: 'id' });
    if (error) {
        alert('Unable to save user: ' + error.message);
        return;
    }

    closeUserModal();
    document.getElementById('userForm').reset();
    loadAllData();
}

async function processBulkCSV() {
    if (!ensureSupabaseClient()) return;

    const rawText = document.getElementById('csvPasteArea').value.trim();
    if (!rawText) return alert('Paste clean values first.');

    const lines = rawText.split('\n');
    const parsedStudents = [];

    lines.forEach(line => {
        if (!line.trim()) return;
        const col = line.split(',');
        if (col.length >= 3) {
            parsedStudents.push({
                id: col[0].trim(),
                name: col[1].trim(),
                dept: col[2].trim().toUpperCase(),
                email: `${col[0].trim()}@metrouni.edu.bd`,
                password: 'temp123',
                role: 'student'
            });
        }
    });

    if (parsedStudents.length > 0) {
        const { error } = await window.supabase.from('users').upsert(parsedStudents, { onConflict: 'id' });
        if (error) {
            alert('Unable to import users: ' + error.message);
            return;
        }
        closeBulkModal();
        document.getElementById('csvPasteArea').value = '';
        loadAllData();
    } else {
        alert('Invalid CSV structure format. Expected: ID, Name, Department');
    }
}

async function saveHall(e) {
    e.preventDefault();
    if (!ensureSupabaseClient()) return;

    const payload = {
        room_number: document.getElementById('hRoom').value.trim(),
        capacity: Number(document.getElementById('hCap').value)
    };
    const { error } = await window.supabase.from('halls').upsert([payload], { onConflict: 'room_number' });
    if (error) {
        alert('Unable to save hall: ' + error.message);
        return;
    }

    closeHallModal();
    document.getElementById('hallForm').reset();
    loadAllData();
}

async function saveDuty(e) {
    e.preventDefault();
    if (!ensureSupabaseClient()) return;

    const payload = {
        teacher_id: document.getElementById('dutyTeacher').value,
        room_number: document.getElementById('dutyHall').value,
        duty_date: document.getElementById('dutyDate').value,
        status: 'Assigned'
    };
    const { error } = await window.supabase.from('duties').insert([payload]);
    if (error) {
        alert('Unable to save duty: ' + error.message);
        return;
    }

    document.getElementById('dutyForm').reset();
    loadAllData();
}

async function wipeTable(tableName, message) {
    if (!ensureSupabaseClient()) return;
    const { error } = await window.supabase.from(tableName).delete().neq('id', 0);
    if (error) {
        alert('Cleanup failed: ' + error.message);
        return;
    }
    alert(message);
    loadAllData();
}

function wipeAllStudents() {
    if (confirm('Are you absolutely sure you want to clear all students?')) {
        wipeTable('users', 'All students removed.');
    }
}

function wipeAllTeachers() {
    if (confirm('Are you absolutely sure you want to clear all teachers?')) {
        wipeTable('users', 'All teachers removed.');
    }
}

function wipeAllHalls() {
    if (confirm('Are you absolutely sure you want to clear all halls?')) {
        wipeTable('halls', 'All halls removed.');
    }
}

function wipeAllInvigilators() {
    if (confirm('Are you absolutely sure you want to clear all duty records?')) {
        wipeTable('duties', 'All duty records removed.');
    }
}

function refreshDutyDropdowns() {
    const tSelect = document.getElementById('dutyTeacher');
    const hSelect = document.getElementById('dutyHall');
    if (tSelect && users) {
        tSelect.innerHTML = users.filter(u => u.role === 'teacher').map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
    if (hSelect && halls) {
        hSelect.innerHTML = halls.map(h => `<option value="${h.room_number}">${h.room_number}</option>`).join('');
    }
}

function renderUsers() {
    const body = document.getElementById('profilesTableBody');
    if (!body) return;
    body.innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.name}</td>
            <td>${u.role ? u.role.toUpperCase() : ''}</td>
            <td>${u.dept || '-'}</td>
        </tr>
    `).join('');
}

function renderHalls() {
    const grid = document.getElementById('hallsGridContainer');
    if (!grid) return;
    grid.innerHTML = halls.map(h => `
        <div class="hall-card">
            <h4>Room ${h.room_number}</h4>
            <p>Capacity: ${h.capacity} Seats</p>
        </div>
    `).join('');
}

function renderDuties() {
    const body = document.getElementById('dutyTableBody');
    if (!body) return;
    body.innerHTML = duties.map(d => {
        const teacher = users.find(u => u.id === d.teacher_id);
        return `
            <tr>
                <td>${teacher ? teacher.name : d.teacher_id}</td>
                <td>Room ${d.room_number}</td>
                <td>${d.duty_date || 'N/A'}</td>
                <td><span class="status-assigned-tag">${d.status || 'Assigned'}</span></td>
            </tr>
        `;
    }).join('');
}

async function triggerDeleteUser(id) {
    if (!ensureSupabaseClient()) return;
    if (confirm(`Permanently delete user with ID: ${id}?`)) {
        const { error } = await window.supabase.from('users').delete().eq('id', id);
        if (!error) loadAllData();
    }
}

async function triggerDeleteHall(room) {
    if (!ensureSupabaseClient()) return;
    if (confirm(`Permanently remove Room ${room}?`)) {
        const { error } = await window.supabase.from('halls').delete().eq('room_number', room);
        if (!error) loadAllData();
    }
}

async function triggerDeleteDuty(id) {
    if (!ensureSupabaseClient()) return;
    if (confirm('Revoke this invigilation duty assignment?')) {
        const { error } = await window.supabase.from('duties').delete().eq('id', id);
        if (!error) loadAllData();
    }
}

async function updateHall(e) {
    e.preventDefault();
    if (!ensureSupabaseClient()) return;
    const room = document.getElementById('editHRoom').value;
    const capacity = document.getElementById('editHCap').value;
    const { error } = await window.supabase.from('halls').update({ capacity: Number(capacity) }).eq('room_number', room);
    if (!error) {
        closeEditHallModal();
        loadAllData();
    }
}

async function runAllocationEngine() {
    if (!ensureSupabaseClient()) return;

    const students = users.filter(u => u.role === 'student' && u.dept);
    if (students.length === 0 || halls.length === 0) {
        return alert('Requires loaded students with departments and configured halls.');
    }

    const pLeft = students.filter(s => s.dept === 'CSE');
    const pRight = students.filter(s => s.dept !== 'CSE');

    let html = '';
    let lIdx = 0;
    let rIdx = 0;
    let bench = 1;
    const generatedAssignments = [];
    const examDate = new Date().toISOString().slice(0, 10);
    const examTime = '10:00 AM - 1:00 PM';

    for (let h = 0; h < halls.length; h++) {
        const roomBenches = Math.floor(parseInt(halls[h].capacity) / 2);
        for (let b = 0; b < roomBenches; b++) {
            if (lIdx >= pLeft.length && rIdx >= pRight.length) break;

            const sL = pLeft[lIdx++] || null;
            const sR = pRight[rIdx++] || null;
            const seatLabel = `Desk ${bench}`;

            if (sL) {
                generatedAssignments.push({
                    student_id: sL.id,
                    course_code: 'AUTO-GENERATED',
                    exam_date: examDate,
                    exam_time: examTime,
                    room_number: halls[h].room_number,
                    seat_vector: `${seatLabel} (Left)`,
                    status: 'Assigned'
                });
            }

            if (sR) {
                generatedAssignments.push({
                    student_id: sR.id,
                    course_code: 'AUTO-GENERATED',
                    exam_date: examDate,
                    exam_time: examTime,
                    room_number: halls[h].room_number,
                    seat_vector: `${seatLabel} (Right)`,
                    status: 'Assigned'
                });
            }

            html += `
                <tr>
                    <td><strong>${seatLabel}</strong></td>
                    <td>${sL ? `${sL.name} (${sL.dept})` : '-'}</td>
                    <td>${sR ? `${sR.name} (${sR.dept})` : '-'}</td>
                    <td>Room ${halls[h].room_number}</td>
                </tr>
            `;
            bench++;
        }
    }

    const resultContainer = document.getElementById('seatingResult');
    if (resultContainer) {
        resultContainer.classList.remove('hidden');
        resultContainer.innerHTML = `
            <div style="margin-bottom: 12px; color: #0f766e; font-weight: 600;">Generated ${generatedAssignments.length} seat assignments.</div>
            <table class="admin-table" style="margin-top:10px; width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f3f4f6; text-align:left;">
                        <th style="padding:10px;">Desk</th>
                        <th style="padding:10px;">Left Seat (CSE)</th>
                        <th style="padding:10px;">Right Seat (Non-CSE)</th>
                        <th style="padding:10px;">Room</th>
                    </tr>
                </thead>
                <tbody>${html}</tbody>
            </table>
        `;
    }

    try {
        const { error } = await window.supabase
            .from('student_seating')
            .delete()
            .neq('id', 0);

        if (error) throw error;

        const { error: insertError } = await window.supabase
            .from('student_seating')
            .insert(generatedAssignments);

        if (insertError) throw insertError;

        alert(`Seating plan saved to Supabase for ${generatedAssignments.length} students.`);
    } catch (err) {
        console.error('Seating persistence error:', err);
        alert(`Seating layout was generated, but saving to Supabase failed: ${err.message || err}`);
    }
}