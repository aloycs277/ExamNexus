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
    loadStudentDashboardData();
});

function loadStudentDashboardData() {
    const studentNameElement = document.getElementById('display-student-name');
    const studentIdElement = document.getElementById('display-student-id');

    const loggedName = sessionStorage.getItem('logged_user_name') || 'Student Terminal User';
    const loggedId = sessionStorage.getItem('logged_user_id') || 'Active Session';

    if (studentNameElement) studentNameElement.innerText = loggedName;
    if (studentIdElement) studentIdElement.innerText = `ID: ${loggedId}`;

    filterSeatingDisplay();
}

async function filterSeatingDisplay() {
    if (!ensureSupabaseClient()) return;

    const searchInput = document.getElementById('seatSearchQuery');
    const tableBody = document.getElementById('studentSeatingGrid');

    if (!tableBody) return;

    const studentId = searchInput ? searchInput.value.trim() : '';

    if (!studentId) {
        tableBody.innerHTML = `
            <tr>
                <td style="text-align: center; padding: 30px; color: #64748b; font-style: italic;">
                    Enter your Student ID in the filter row field above to view your room matrix assignment.
                </td>
            </tr>`;
        return;
    }

    try {
        const { data, error } = await window.supabase
            .from('student_seating')
            .select('student_id,course_code,exam_date,exam_time,room_number,seat_vector,status')
            .eq('student_id', studentId)
            .order('exam_date');

        if (error) throw error;

        if (!data || data.length === 0) {
            renderTableError(tableBody, studentId);
            return;
        }

        tableBody.innerHTML = data.map(item => `
            <tr>
                <td style="text-align: left; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
                    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #2563eb;">Assigned Exam Hall</div>
                    <div style="font-size: 26px; font-weight: 700; margin-top: 6px; color: #0f172a;">Room ${item.room_number}</div>
                    <div style="margin-top: 10px; font-size: 13px; color: #334155;">Course: ${item.course_code}</div>
                    <div style="font-size: 13px; color: #334155;">Date: ${item.exam_date} • ${item.exam_time}</div>
                    <div style="font-size: 13px; color: #334155;">Seat: ${item.seat_vector}</div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Dashboard Array Exception Handling:', err);
        renderTableError(tableBody, studentId);
    }
}

function renderTableError(container, searchId) {
    container.innerHTML = `
        <tr>
            <td style="text-align: center; padding: 25px; background-color: #7f1d1d; color: #fca5a5; border-radius: 8px; font-weight: 500;">
                <i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px;"></i>
                No active room allocation found for ID: <strong>${searchId}</strong>
            </td>
        </tr>
    `;
}

function handleLogout() {
    window.location.href = 'index.html';
}