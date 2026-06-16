
// --- Core DOM Overlay Matrix Selectors ---
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const adminModal = document.getElementById('adminModal');

// Hardcoded Master Admin System Accounts Verification Rules
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
    
// Completely flush active keystroke inputs safely across forms
    document.querySelectorAll('form').forEach(form => form.reset());
}


 //INTERNAL CONTROL TAB LOGIC RULES


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


//SECURE AUTH SUBMISSION MATRIX EVALUATION


function handleAuthSubmit(event, actionType) {
    event.preventDefault();

    // Student Signup Logic Array
    if (actionType === 'register-student') {
        const name = document.getElementById('reg-student-name').value;
        const id = document.getElementById('reg-student-id').value;
        const pass = document.getElementById('reg-student-pass').value;

        localStorage.setItem(`student_${id}`, JSON.stringify({ name: name, pass: pass }));
        alert(`Account Registered.\nID: ${id}\nYou can now access the login gateway.`);
        closeAllModals();
    } 
    
    // Teacher Signup Logic Array
    else if (actionType === 'register-teacher') {
        const name = document.getElementById('reg-teacher-name').value;
        const email = document.getElementById('reg-teacher-email').value;
        const pass = document.getElementById('reg-teacher-pass').value;

        localStorage.setItem(`teacher_${email.toLowerCase()}`, JSON.stringify({ name: name, pass: pass }));
        alert(`Faculty Profile Stored.\nEmail: ${email}\nYou can now log in.`);
        closeAllModals();
    } 
    
    // Student Login Validation Checking
    else if (actionType === 'login-student') {
        const id = document.getElementById('login-student-id').value;
        const pass = document.getElementById('login-student-pass').value;
        const storedAccount = localStorage.getItem(`student_${id}`);

        if (storedAccount) {
            const accountData = JSON.parse(storedAccount);
            if (accountData.pass === pass) {
                alert(`Welcome back, ${accountData.name}! Student session authenticated.`);
                closeAllModals();
            } else {
                alert("Incorrect entry code credential data.");
            }
        } else {
            alert("No account profile matches this identity array. Please execute system registration first.");
        }
    } 
    
    // Teacher Login Validation Checking
    else if (actionType === 'login-teacher') {
        const email = document.getElementById('login-teacher-email').value.toLowerCase();
        const pass = document.getElementById('login-teacher-pass').value;
        const storedAccount = localStorage.getItem(`teacher_${email}`);

        if (storedAccount) {
            const accountData = JSON.parse(storedAccount);
            if (accountData.pass === pass) {
                alert(`Faculty Connection Secure. Welcome back, Professor ${accountData.name}.`);
                closeAllModals();
            } else {
                alert("Incorrect password mapping sequence.");
            }
        } else {
            alert("No existing record matches this institutional email array.");
        }
    }
    
    // Secure Hardcoded Master Admin Authentication Rule Matrix Execution
    else if (actionType === 'login-admin') {
        const inputtedEmail = document.getElementById('admin-email').value.trim().toLowerCase();
        const inputtedPass = document.getElementById('admin-pass').value;

        if (inputtedEmail === MASTER_ADMIN_GMAIL && inputtedPass === MASTER_ADMIN_PASS) {
            alert("Authorization Confirmed. Deploying Admin Node Workspace...");
            closeAllModals();
            window.location.href = "admin.html";
        } else {
            alert("Access Denied: Invalid Administrative Credentials Detected.");
        }
    }
}


//INTERFACE SWITCH CONTROLLER MODULES


function switchSection(targetSectionId) {
    // Hide specialized admin console workspace if standard links are clicked
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
    // Hide default home page structure layout configuration nodes
    document.getElementById('welcome').classList.add('hidden');
    
    // Surface the secure hidden control panel card cleanly
    document.getElementById('admin-panel').classList.remove('hidden');
    
    // Pull highlighters from normal navigation options
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Global modal window dismissal handler 
window.addEventListener('click', (e) => {
    if (e.target === loginModal || e.target === registerModal || e.target === adminModal) {
        closeAllModals();
    }
});