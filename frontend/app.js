const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const adminModal = document.getElementById('adminModal');

const MASTER_ADMIN_GMAIL = "admin@metrouni.edu.bd";
const MASTER_ADMIN_PASS = "admin1234";

function openLoginModal(role) {
    closeAllModals();
    if (loginModal) {
        loginModal.classList.remove('hidden');
        switchLoginTab(role);
    }
}

function openRegisterModal(role) {
    closeAllModals();
    if (registerModal) {
        registerModal.classList.remove('hidden');
        switchRegisterTab(role);
    }
}

function openAdminModal() {
    closeAllModals();
    if (adminModal) {
        adminModal.classList.remove('hidden');
    }
}

function closeAllModals() {
    if (loginModal) loginModal.classList.add('hidden');
    if (registerModal) registerModal.classList.add('hidden');
    if (adminModal) adminModal.classList.add('hidden');
    document.querySelectorAll('form').forEach(form => form.reset());
}

function switchLoginTab(role) {
    const studentForm = document.getElementById('form-login-student');
    const teacherForm = document.getElementById('form-login-teacher');
    const studentTab = document.getElementById('tab-login-student');
    const teacherTab = document.getElementById('tab-login-teacher');

    if (role === 'student') {
        studentForm.classList.remove('hidden');
        studentTab.classList.add('active');
        teacherForm.classList.add('hidden');
        teacherTab.classList.remove('active');
    } else {
        teacherForm.classList.remove('hidden');
        teacherTab.classList.add('active');
        studentForm.classList.add('hidden');
        studentTab.classList.remove('active');
    }
}

function switchRegisterTab(role) {
    const studentForm = document.getElementById('form-reg-student');
    const teacherForm = document.getElementById('form-reg-teacher');
    const studentTab = document.getElementById('tab-reg-student');
    const teacherTab = document.getElementById('tab-reg-teacher');

    if (role === 'student') {
        studentForm.classList.remove('hidden');
        studentTab.classList.add('active');
        teacherForm.classList.add('hidden');
        teacherTab.classList.remove('active');
    } else {
        teacherForm.classList.remove('hidden');
        teacherTab.classList.add('active');
        studentForm.classList.add('hidden');
        studentTab.classList.remove('active');
    }
}

function ensureSupabaseClient() {
    const client = window.supabaseClient || window.supabase;
    if (!client) {
        alert('Supabase is not configured yet. Update the placeholders in frontend/supabase-config.js with your project URL and anon key.');
        return false;
    }
    window.supabase = client;
    return true;
}

async function handleAuthSubmit(event, actionType) {
    event.preventDefault();

    if (!ensureSupabaseClient()) {
        return;
    }

    if (actionType === 'login-admin') {
        const inputtedEmail = document.getElementById('admin-email').value.trim().toLowerCase();
        const inputtedPass = document.getElementById('admin-pass').value;

        if (inputtedEmail === MASTER_ADMIN_GMAIL && inputtedPass === MASTER_ADMIN_PASS) {
            alert('Authorization Confirmed. Deploying Admin Node Workspace...');
            sessionStorage.setItem('examshield_admin_logged', 'true');
            closeAllModals();
            window.location.replace('admin.html');
        } else {
            alert('Access Denied: Invalid Administrative Credentials Detected.');
        }
        return;
    }

    let payload = {};

    if (actionType === 'register-student') {
        const rawId = document.getElementById('reg-student-id').value.trim().toLowerCase().replace(/\s+/g, '');
        if (!rawId || rawId.includes('@')) {
            return alert('Please enter a valid student ID without email formatting.');
        }
        payload = {
            id: rawId,
            name: document.getElementById('reg-student-name').value.trim(),
            email: `${rawId}@metrouni.edu.bd`,
            password: document.getElementById('reg-student-pass').value,
            role: 'student',
            dept: 'CSE'
        };
    } else if (actionType === 'register-teacher') {
        const rawEmail = document.getElementById('reg-teacher-email').value.trim().toLowerCase().replace(/\s+/g, '');
        if (!rawEmail || !rawEmail.includes('@')) {
            return alert('Please enter a valid teacher email address.');
        }
        payload = {
            id: rawEmail,
            name: document.getElementById('reg-teacher-name').value.trim(),
            email: rawEmail,
            password: document.getElementById('reg-teacher-pass').value,
            role: 'teacher',
            dept: 'CSE'
        };
    } else if (actionType === 'login-student') {
        payload = {
            uid_email: document.getElementById('login-student-id').value.trim().toLowerCase().replace(/\s+/g, ''),
            password: document.getElementById('login-student-pass').value
        };
    } else if (actionType === 'login-teacher') {
        payload = {
            uid_email: document.getElementById('login-teacher-email').value.trim().toLowerCase(),
            password: document.getElementById('login-teacher-pass').value
        };
    }

    let user = null;

    try {
        if (actionType.startsWith('register')) {
            const { data: existingById, error: idError } = await window.supabase
                .from('portal_users')
                .select('id')
                .eq('id', payload.id)
                .maybeSingle();

            if (idError) {
                console.error('Supabase duplicate check error:', idError);
                alert(`Registration failed: ${idError.message}`);
                return;
            }

            const { data: existingByEmail, error: emailError } = await window.supabase
                .from('portal_users')
                .select('id')
                .eq('email', payload.email)
                .maybeSingle();

            if (emailError) {
                console.error('Supabase duplicate check error:', emailError);
                alert(`Registration failed: ${emailError.message}`);
                return;
            }

            if (existingById || existingByEmail) {
                const duplicateField = existingById ? 'ID' : 'Email';
                const duplicateValue = existingById ? payload.id : payload.email;
                const actionLabel = actionType === 'register-student' ? 'student ID' : 'teacher email';
                alert(`Registration blocked: ${duplicateField} ${duplicateValue} is already in use. Please log in or choose a different ${actionLabel}.`);
                return;
            }

            const { data: insertedUser, error: insertError } = await window.supabase
                .from('portal_users')
                .insert([payload])
                .select('id,name,role,dept')
                .maybeSingle();

            if (insertError) {
                console.error('Supabase registration error:', insertError);
                alert(`Registration failed: ${insertError.message}`);
                return;
            }

            closeAllModals();
            alert(`Registration successful. Please log in using your ${actionType === 'register-student' ? 'student ID' : 'teacher email'} and password.`);
            return;
        } else if (actionType === 'login-student' || actionType === 'login-teacher') {
            const query = window.supabase
                .from('portal_users')
                .select('id,name,role,dept');

            if (actionType === 'login-student') {
                query.eq('id', payload.uid_email);
            } else {
                query.ilike('email', payload.uid_email);
            }

            query.eq('password', payload.password);
            const { data: foundUser, error: loginError } = await query.maybeSingle();

            if (loginError) {
                console.error('Supabase login lookup error:', loginError);
                alert(`Login lookup failed: ${loginError.message}`);
                return;
            }

            user = foundUser;
        }

        if (!user) {
            alert('Authentication failed. Check your ID/email and password.');
            return;
        }

        closeAllModals();
        alert(`Authentication confirmed. Welcome back, ${user.name}!`);

        sessionStorage.setItem('logged_user_id', user.id);
        sessionStorage.setItem('logged_user_name', user.name);
        sessionStorage.setItem('logged_user_role', user.role);

        if (user.role === 'teacher') {
            window.location.replace('teacher_dashboard.html');
        } else {
            window.location.replace('student_dashboard.html');
        }
    } catch (err) {
        console.error('Supabase auth exception:', err);
        alert(`Authentication gateway issue: ${err.message || err}`);
    }
}

function switchSection(targetSectionId) {
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('welcome').classList.remove('hidden');

    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
        const clickAttr = item.getAttribute('onclick') || '';
        if (clickAttr.includes(targetSectionId)) {
            item.classList.add('active');
        }
    });
}

function showAdminDashboardSection() {
    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');

    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.classList.remove('active');
    });
}

window.addEventListener('click', (e) => {
    if (e.target === loginModal || e.target === registerModal || e.target === adminModal) {
        closeAllModals();
    }
});

// Load student count from database
document.addEventListener('DOMContentLoaded', function() {
    // Add small delay to ensure Supabase is loaded from supabase-config.js
    setTimeout(loadStudentCount, 500);
});

async function loadStudentCount() {
    if (!ensureSupabaseClient()) {
        console.warn('Could not load student count - Supabase not available');
        return;
    }

    try {
        // Query all students from exam_students table (used in User Management)
        const { data, error } = await window.supabase
            .from('exam_students')
            .select('*');

        if (error) {
            console.error('❌ Error querying exam_students:', error);
            throw error;
        }

        const studentCount = data ? data.length : 0;
        const countElement = document.getElementById('studentCount');
        
        if (countElement) {
            countElement.innerText = studentCount.toLocaleString();
            console.log(`✅ Successfully loaded student count from exam_students: ${studentCount}`);
        }
    } catch (err) {
        console.error('❌ Error loading student count:', err);
        const countElement = document.getElementById('studentCount');
        if (countElement) {
            countElement.innerText = '0';  // Show 0 if error occurs
        }
    }
}