function initAuthUI() {
  const user = localStorage.getItem('user');
  if (user && window.location.pathname.includes('index.html')) {
    window.location.href = '/feed.html';
  }

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const forgotForm = document.getElementById('forgotForm');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (signupForm) signupForm.addEventListener('submit', handleSignup);
  if (forgotForm) forgotForm.addEventListener('submit', handleForgot);

  // Setup floating labels & validation
  document.querySelectorAll('.input-field').forEach(input => {
    input.addEventListener('blur', () => {
      validateInput(input);
    });
    input.addEventListener('input', () => {
      input.classList.remove('error');
    });
  });

  // Password visibility
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });

  // Password Strength
  const signupPassword = document.getElementById('signupPassword');
  if (signupPassword) {
    signupPassword.addEventListener('input', (e) => {
      const pwd = e.target.value;
      const strengthContainer = document.getElementById('pwdStrengthContainer');
      const bar = document.getElementById('pwdStrengthBar');
      
      if (pwd.length === 0) {
        strengthContainer.style.display = 'none';
        return;
      }
      
      strengthContainer.style.display = 'block';
      let score = 0;
      if (pwd.length > 7) score++;
      if (/(?=.*[A-Z])/.test(pwd)) score++;
      if (/(?=.*\d)/.test(pwd)) score++;
      if (/(?=.*[!@#$%^&*])/.test(pwd)) score++;

      bar.className = 'password-strength-bar';
      if (score < 2) bar.classList.add('strength-weak');
      else if (score === 2 || score === 3) bar.classList.add('strength-medium');
      else bar.classList.add('strength-strong');
    });
  }
}

function toggleSection(sectionId) {
  ['loginSection', 'signupSection', 'forgotSection'].forEach(id => {
    document.getElementById(id).style.display = (id === sectionId) ? 'block' : 'none';
  });
}

function validateInput(input) {
  let isValid = input.checkValidity();
  if (!isValid && input.value !== '') {
    input.classList.add('error');
    return false;
  }
  input.classList.remove('error');
  return true;
}

function validateForm(formId) {
  const form = document.getElementById(formId);
  let isValid = true;
  form.querySelectorAll('.input-field').forEach(input => {
    if (!validateInput(input)) isValid = false;
  });
  return isValid;
}

function setBtnLoading(btnId, isLoading) {
  const btn = document.getElementById(btnId);
  if (isLoading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  if (!validateForm('loginForm')) return;

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  setBtnLoading('loginBtn', true);
  try {
    const res = await fetchWithAuth('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/feed.html';
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  } finally {
    setBtnLoading('loginBtn', false);
  }
}

async function handleSignup(e) {
  e.preventDefault();
  if (!validateForm('signupForm')) return;

  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  setBtnLoading('signupBtn', true);
  try {
    const res = await fetchWithAuth('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/feed.html';
    } else {
      showToast(data.message || 'Signup failed', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  } finally {
    setBtnLoading('signupBtn', false);
  }
}

async function handleForgot(e) {
  e.preventDefault();
  if (!validateForm('forgotForm')) return;
  const email = document.getElementById('forgotEmail').value;
  setBtnLoading('forgotBtn', true);
  try {
    const res = await fetchWithAuth('/auth/forgotpassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('OTP sent to your email!', 'success');
      // In a real flow, you'd show an OTP input next
      setTimeout(() => toggleSection('loginSection'), 2000);
    } else {
      showToast(data.message || 'Error', 'error');
    }
  } catch(e) {
    showToast('Network error', 'error');
  } finally {
    setBtnLoading('forgotBtn', false);
  }
}
