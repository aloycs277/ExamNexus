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
        const id = document.getElementById('reg-student-id').value.trim();
        payload = {
            id,
            name: document.getElementById('reg-student-name').value.trim(),
            email: `${id}@metrouni.edu.bd`,
            password: document.getElementById('reg-student-pass').value,
            role: 'student',
            dept: 'CSE'
        };
    } else if (actionType === 'register-teacher') {
        const email = document.getElementById('reg-teacher-email').value.trim();
        payload = {
            id: email.split('@')[0],
            name: document.getElementById('reg-teacher-name').value.trim(),
            email,
            password: document.getElementById('reg-teacher-pass').value,
            role: 'teacher',
            dept: 'CSE'
        };
    } else if (actionType === 'login-student') {
        payload = {
            uid_email: document.getElementById('login-student-id').value.trim(),
            password: document.getElementById('login-student-pass').value
        };
    } else if (actionType === 'login-teacher') {
        payload = {
            uid_email: document.getElementById('login-teacher-email').value.trim(),
            password: document.getElementById('login-teacher-pass').value
        };
    }

    try {
        if (actionType.startsWith('register')) {
            const { data: existingById, error: existingIdError } = await window.supabase
                .from('users')
                .select('id')
                .eq('id', payload.id)
                .maybeSingle();

            if (existingIdError) {
                console.error('Supabase duplicate check error:', existingIdError);
                alert(`Registration failed: ${existingIdError.message}`);
                return;
            }

            const { data: existingByEmail, error: existingEmailError } = await window.supabase
                .from('users')
                .select('id')
                .eq('email', payload.email)
                .maybeSingle();

            if (existingEmailError) {
                console.error('Supabase email duplicate check error:', existingEmailError);
                alert(`Registration failed: ${existingEmailError.message}`);
                return;
            }

            if (existingById || existingByEmail) {
                const duplicateField = existingById ? 'ID' : 'Email';
                const duplicateValue = existingById ? payload.id : payload.email;
                const actionLabel = actionType === 'register-student' ? 'student ID' : 'teacher email';
                alert(`Registration blocked: ${duplicateField} ${duplicateValue} is already in use. Please log in or choose a different ${actionLabel}.`);
                return;
            }

            const result = await window.supabase
                .from('users')
                .insert([payload])
                .select('id,name,role')
                .single();

            if (result.error) {
                console.error('Supabase insert error:', result.error);
                alert(`Registration failed: ${result.error.message}`);
                return;
            }

            closeAllModals();
            alert(`Account created successfully for ${result.data.name}. You can now log in.`);
            return;
        }

        const credential = payload.uid_email;
        const password = payload.password;

        const { data: byId, error: byIdError } = await window.supabase
            .from('users')
            .select('id,name,role,dept')
            .eq('id', credential)
            .eq('password', password)
            .maybeSingle();

        if (byIdError) {
            console.error('Supabase login lookup error:', byIdError);
            alert(`Login lookup failed: ${byIdError.message}`);
            return;
        }

        let user = byId;

        if (!user) {
            const { data: byEmail, error: byEmailError } = await window.supabase
                .from('users')
                .select('id,name,role,dept')
                .eq('email', credential)
                .eq('password', password)
                .maybeSingle();

            if (byEmailError) {
                console.error('Supabase email login lookup error:', byEmailError);
                alert(`Login lookup failed: ${byEmailError.message}`);
                return;
            }
            user = byEmail;
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