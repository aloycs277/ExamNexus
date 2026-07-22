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
    filterTeacherSchedule();
});

async function filterTeacherSchedule() {
    if (!ensureSupabaseClient()) return;

    const searchInput = document.getElementById('teacherSearchQuery');
    const tableBody = document.getElementById('teacherScheduleGrid');

    if (!tableBody) return;

    const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (!searchValue) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #64748b; font-style: italic;">
                    Please input your name in the search field above to retrieve your scheduled exam rooms.
                </td>
            </tr>`;
        return;
    }

    try {
        const { data: dutiesData, error: dutiesError } = await window.supabase
            .from('duties')
            .select('id,teacher_id,room_number,duty_date,status')
            .order('duty_date');
        if (dutiesError) throw dutiesError;

        const { data: usersData, error: usersError } = await window.supabase
            .from('users')
            .select('id,name')
            .eq('role', 'teacher');
        if (usersError) throw usersError;

        const teacherMap = new Map((usersData || []).map(user => [user.id, user.name]));
        const searchTokens = searchValue.split(/\s+/).filter(Boolean);
        const filteredRecords = (dutiesData || []).filter(row => {
            const teacherName = teacherMap.get(row.teacher_id) || '';
            const teacherWords = teacherName.toLowerCase().split(/\s+/).filter(Boolean);
            return searchTokens.every(token => teacherWords.some(word => word === token));
        });

        if (filteredRecords.length > 0) {
            tableBody.innerHTML = filteredRecords.map(row => `
                <tr>
                    <td style="font-weight: 600; color: #f8fafc;">${teacherMap.get(row.teacher_id) || 'Unassigned'}</td>
                    <td style="color: #38bdf8; font-weight: 600;"><i class="fa-solid fa-door-open"></i> Room ${row.room_number || 'N/A'}</td>
                    <td style="color: #e2e8f0;">${row.duty_date || 'Regular Schedule Slot'}</td>
                    <td><span style="color: #0f766e; font-weight: 600; font-size: 13px;">${row.status || 'Assigned'}</span></td>
                    <td><span style="color: #22c55e; font-size: 13px;"><i class="fa-solid fa-circle-check"></i> Confirmed</span></td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 25px; background-color: #334155; color: #94a3b8;">
                        <i class="fa-solid fa-circle-info" style="margin-right: 6px;"></i>
                        No assigned duties found matching "<strong>${searchInput.value}</strong>"
                    </td>
                </tr>`;
        }
    } catch (err) {
        console.error('Teacher Panel Exception Error:', err);
        renderErrorRow(tableBody, 'Unable to pull live matrix registry arrays from Supabase.');
    }
}

function renderErrorRow(container, message) {
    container.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 25px; background-color: #7f1d1d; color: #fca5a5; border-radius: 8px;">
                <i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px;"></i> ${message}
            </td>
        </tr>
    `;
}

function handleLogout() {
    window.location.href = 'index.html';
}