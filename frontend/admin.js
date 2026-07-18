let users = [];
let examStudents = [];
let portalUsers = [];
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
            .select('id,name,role,dept,email,password')
            .order('name');
        if (usersError) throw usersError;
        users = usersData || [];

        const { data: portalUsersData, error: portalUsersError } = await window.supabase
            .from('portal_users')
            .select('id,name,role,dept,email')
            .order('name');
        if (portalUsersError) throw portalUsersError;
        portalUsers = portalUsersData || [];

        const { data: examStudentsData, error: examError } = await window.supabase
            .from('exam_students')
            .select('id,name,dept,email')
            .order('name');
        if (examError) throw examError;
        examStudents = examStudentsData || [];

        renderUsers();
        renderStudentRegistry();
        renderTeacherRegistry();

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

        await loadExistingSeating();

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

    const rawIdentifier = document.getElementById('uID').value.trim();
    const role = document.getElementById('uRole').value;
    const name = document.getElementById('uName').value.trim();
    const dept = document.getElementById('uDept').value;

    if (!rawIdentifier || !name) {
        return alert('Please enter both name and identifier before saving.');
    }

    if (role === 'student') {
        const studentId = rawIdentifier.toLowerCase().replace(/\s+/g, '');
        if (studentId.includes('@')) {
            return alert('Student ID should not contain an email symbol. Enter only the student ID.');
        }

        const studentPayload = {
            id: studentId,
            name,
            dept,
            email: `${studentId}@metrouni.edu.bd`
        };

        const { data: existingId, error: idError } = await window.supabase
            .from('exam_students')
            .select('id')
            .eq('id', studentPayload.id)
            .maybeSingle();

        if (idError) {
            alert('Unable to validate student uniqueness: ' + idError.message);
            return;
        }

        const { data: existingEmail, error: emailError } = await window.supabase
            .from('exam_students')
            .select('id')
            .eq('email', studentPayload.email)
            .maybeSingle();

        if (emailError) {
            alert('Unable to validate student email uniqueness: ' + emailError.message);
            return;
        }

        if (existingId || existingEmail) {
            const duplicateField = existingId ? 'ID' : 'Email';
            const duplicateValue = existingId ? studentPayload.id : studentPayload.email;
            alert(`Duplicate blocked: ${duplicateField} ${duplicateValue} is already stored in exam roster. Use a different student ID.`);
            return;
        }

        const { error } = await window.supabase.from('exam_students').insert([studentPayload]);
        if (error) {
            alert('Unable to save exam student: ' + error.message);
            return;
        }
    } else {
        const teacherEmail = rawIdentifier.toLowerCase().replace(/\s+/g, '');
        if (!teacherEmail.includes('@')) {
            return alert('Teacher identifier must be a valid Gmail address. Enter the full email.');
        }

        const teacherPayload = {
            id: teacherEmail,
            name,
            dept,
            email: teacherEmail,
            password: 'temp123',
            role: 'teacher'
        };

        const { data: existingId, error: idError } = await window.supabase
            .from('users')
            .select('id')
            .eq('id', teacherPayload.id)
            .maybeSingle();

        if (idError) {
            alert('Unable to validate teacher uniqueness: ' + idError.message);
            return;
        }

        const { data: existingEmail, error: emailError } = await window.supabase
            .from('users')
            .select('id')
            .eq('email', teacherPayload.email)
            .maybeSingle();

        if (emailError) {
            alert('Unable to validate teacher email uniqueness: ' + emailError.message);
            return;
        }

        if (existingId || existingEmail) {
            const duplicateField = existingId ? 'ID' : 'Email';
            const duplicateValue = existingId ? teacherPayload.id : teacherPayload.email;
            alert(`Duplicate blocked: ${duplicateField} ${duplicateValue} is already stored. Use a unique teacher email.`);
            return;
        }

        const { error } = await window.supabase.from('users').insert([teacherPayload]);
        if (error) {
            alert('Unable to save user: ' + error.message);
            return;
        }
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
                id: col[0].trim().toLowerCase(),
                name: col[1].trim(),
                dept: col[2].trim().toUpperCase(),
                email: `${col[0].trim().toLowerCase()}@metrouni.edu.bd`,
                password: 'temp123',
                role: 'student'
            });
        }
    });

    if (parsedStudents.length === 0) {
        return alert('Invalid CSV structure format. Expected: ID, Name, Department on each line.');
    }

    try {
        const rosterStudents = parsedStudents.map(s => ({
            id: s.id,
            name: s.name,
            dept: s.dept,
            email: `${s.id}@metrouni.edu.bd`
        }));

        const { data, error } = await window.supabase
            .from('exam_students')
            .upsert(rosterStudents, { onConflict: ['id'] });

        if (error) {
            console.error('Bulk import error:', error, data);
            return alert('Unable to import students: ' + error.message);
        }

        alert(`Imported ${Array.isArray(data) ? data.length : rosterStudents.length} student records successfully.`);
        closeBulkModal();
        document.getElementById('csvPasteArea').value = '';
        loadAllData();
    } catch (err) {
        console.error('Bulk import exception:', err);
        alert('Bulk import failed: ' + (err.message || err));
    }
}

async function saveHall(e) {
    e.preventDefault();
    if (!ensureSupabaseClient()) return;

    const roomNumber = document.getElementById('hRoom').value.trim();
    const capacity = Number(document.getElementById('hCap').value);

    if (!roomNumber) {
        return alert('Please enter a room name before saving.');
    }

    const { data: existingHall, error: checkError } = await window.supabase
        .from('halls')
        .select('room_number')
        .eq('room_number', roomNumber)
        .maybeSingle();

    if (checkError) {
        alert('Unable to verify room uniqueness: ' + checkError.message);
        return;
    }

    if (existingHall) {
        alert('This room name already exists. Please choose a different room name.');
        return;
    }

    const payload = {
        room_number: roomNumber,
        capacity: capacity
    };
    const { error } = await window.supabase.from('halls').insert([payload]);
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

    const teacherId = document.getElementById('dutyTeacher').value;
    const roomNumber = document.getElementById('dutyHall').value;
    const dutyDate = document.getElementById('dutyDate').value;

    if (!teacherId || !roomNumber || !dutyDate) {
        return alert('Please select a teacher, hall, and date before assigning duty.');
    }

    const { data: existingAssignment, error: existingError } = await window.supabase
        .from('duties')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('duty_date', dutyDate)
        .maybeSingle();

    if (existingError) {
        alert('Unable to verify duty assignment: ' + existingError.message);
        return;
    }

    if (existingAssignment) {
        alert('This teacher is already assigned on the selected date. Choose another date or teacher.');
        return;
    }

    const payload = {
        teacher_id: teacherId,
        room_number: roomNumber,
        duty_date: dutyDate,
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

async function wipeAllStudents() {
    if (!ensureSupabaseClient()) return;
    if (!confirm('Are you absolutely sure you want to clear all exam roster entries?')) return;

    const { error } = await window.supabase.from('exam_students').delete().neq('id', '');
    if (error) {
        alert('Cleanup failed: ' + error.message);
        return;
    }
    alert('All exam roster entries removed.');
    loadAllData();
}

async function wipeAllTeachers() {
    if (!ensureSupabaseClient()) return;
    if (!confirm('Are you absolutely sure you want to clear all teachers?')) return;

    const { error } = await window.supabase.from('users').delete().eq('role', 'teacher');
    if (error) {
        alert('Cleanup failed: ' + error.message);
        return;
    }
    alert('All teachers removed.');
    loadAllData();
}

async function wipeAllHalls() {
    if (!ensureSupabaseClient()) return;
    if (!confirm('Are you absolutely sure you want to clear all halls?')) return;

    const { error } = await window.supabase.from('halls').delete().neq('room_number', '');
    if (error) {
        alert('Cleanup failed: ' + error.message);
        return;
    }

    alert('All halls removed.');
    loadAllData();
}

async function wipeAllInvigilators() {
    if (!ensureSupabaseClient()) return;
    if (!confirm('Are you absolutely sure you want to clear all duty records?')) return;

    const { error } = await window.supabase.from('duties').delete().not('id', 'is', null);
    if (error) {
        alert('Cleanup failed: ' + error.message);
        return;
    }

    alert('All duty records removed.');
    loadAllData();
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

function handleAdminLogout() {
    window.location.href = 'index.html';
}

async function loadExistingSeating() {
    if (!ensureSupabaseClient()) return;

    const resultContainer = document.getElementById('seatingResult');
    if (!resultContainer) return;

    try {
        const { data, error } = await window.supabase
            .from('student_seating')
            .select('student_id,course_code,exam_date,exam_time,room_number,seat_vector,status')
            .order('room_number,seat_vector');

        if (error) throw error;
        if (!data || data.length === 0) {
            resultContainer.classList.add('hidden');
            resultContainer.innerHTML = '';
            return;
        }

        const studentDeptMap = examStudents.reduce((map, student) => {
            map[student.id] = student.dept;
            return map;
        }, {});

        const assignmentsByRoom = data.reduce((acc, item) => {
            const room = item.room_number;
            const match = item.seat_vector.match(/^(Desk \d+) \((Left|Right)\)$/i);
            if (!match) return acc;

            const desk = match[1];
            const side = match[2].toLowerCase();
            acc[room] = acc[room] || {};
            acc[room][desk] = acc[room][desk] || { room_number: room, desk, left: null, right: null };
            acc[room][desk][side] = item;
            return acc;
        }, {});

        const formatSeatId = item => {
            if (!item) return '-';
            const dept = studentDeptMap[item.student_id] ? `(${studentDeptMap[item.student_id]})` : '';
            return `${item.student_id}${dept}`;
        };

        let html = '';
        Object.keys(assignmentsByRoom).forEach(room => {
            const desks = Object.values(assignmentsByRoom[room]).sort((a, b) => {
                const aNum = Number(a.desk.replace(/\D/g, ''));
                const bNum = Number(b.desk.replace(/\D/g, ''));
                return aNum - bNum;
            });

            desks.forEach(deskEntry => {
                html += `
                    <tr>
                        <td><strong>${deskEntry.desk}</strong></td>
                        <td>${formatSeatId(deskEntry.left)}</td>
                        <td>${formatSeatId(deskEntry.right)}</td>
                        <td>Room ${room}</td>
                    </tr>
                `;
            });
        });

        resultContainer.classList.remove('hidden');
        resultContainer.innerHTML = `
            <div style="margin-bottom: 12px; color: #0f766e; font-weight: 600;">Loaded ${data.length} saved seat assignments.</div>
            <table class="admin-table" style="margin-top:10px; width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f3f4f6; text-align:left;">
                        <th style="padding:10px;">Desk</th>
                        <th style="padding:10px;">Left Seat</th>
                        <th style="padding:10px;">Right Seat</th>
                        <th style="padding:10px;">Room</th>
                    </tr>
                </thead>
                <tbody>${html}</tbody>
            </table>
        `;
    } catch (err) {
        console.error('Loading existing seating failed:', err);
        resultContainer.classList.add('hidden');
        resultContainer.innerHTML = '';
    }
}

function renderUsers() {
    const body = document.getElementById('profilesTableBody');
    if (!body) return;

    const rows = [
        ...examStudents.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: 'student',
            dept: u.dept
        })),
        ...users.filter(u => u.role === 'teacher').map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: 'teacher',
            dept: u.dept
        }))
    ];

    body.innerHTML = rows
        .map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.name}</td>
                <td>${u.email || '-'}</td>
                <td>${u.role ? u.role.toUpperCase() : ''}</td>
                <td>${u.dept || '-'}</td>
                <td>
                    <button class="btn-danger btn-table-action" onclick="triggerDeleteUser('${u.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
}

function renderStudentRegistry() {
    const body = document.getElementById('studentsTableBody');
    if (!body) return;
    body.innerHTML = portalUsers
        .filter(u => u.role === 'student')
        .map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.id}</td>
                <td>${u.role ? u.role.toUpperCase() : ''}</td>
            </tr>
        `).join('');
}

function renderTeacherRegistry() {
    const body = document.getElementById('teachersTableBody');
    if (!body) return;
    body.innerHTML = portalUsers
        .filter(u => u.role === 'teacher')
        .map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.email || '-'}</td>
                <td>${u.role ? u.role.toUpperCase() : ''}</td>
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
            <button class="btn-danger btn-card-action" onclick="triggerDeleteHall('${h.room_number}')">Delete</button>
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
                <td>
                    <button class="btn-danger btn-table-action" onclick="triggerDeleteDuty('${d.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function triggerDeleteUser(id) {
    if (!ensureSupabaseClient()) return;
    if (!confirm(`Permanently delete user with ID: ${id}?`)) return;

    const { data: examData, error: examError } = await window.supabase
        .from('exam_students')
        .delete()
        .eq('id', id)
        .select('id');

    if (examError) {
        alert('Unable to delete exam roster entry: ' + examError.message);
        return;
    }

    if (examData && examData.length > 0) {
        loadAllData();
        return;
    }

    const { error: userError } = await window.supabase.from('users').delete().eq('id', id);
    if (userError) {
        alert('Unable to delete user: ' + userError.message);
        return;
    }

    loadAllData();
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

    const students = examStudents.filter(s => s.dept);
    if (students.length === 0 || halls.length === 0) {
        return alert('Requires loaded exam roster students with departments and configured halls.');
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