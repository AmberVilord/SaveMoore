// ──────────────────────────────────────────────────────────────
//  Save Moore — Authentication
//  This site has ONE seller and any number of buyers.
//
//  OWNER: Set SELLER_EMAIL to your own email address.
//         Only that exact email will receive seller (admin) access.
//         All other registered accounts are buyers.
//
//  Registered users are stored PERMANENTLY in localStorage.
//  Active sessions are stored in sessionStorage (tab-scoped).
// ──────────────────────────────────────────────────────────────

var SELLER_EMAIL   = 'seller@savemoore.com'; // ← owner: change this to your email
var SM_USERS_KEY   = 'sm_registered_users';
var SM_SESSION_KEY = 'sm_active_session';

// Hash a password with SHA-256 + a site salt (Web Crypto API).
async function smHashPassword(password) {
  var encoder = new TextEncoder();
  var data = encoder.encode('savemoore::' + password);
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(function (b) { return b.toString(16).padStart(2, '0'); })
    .join('');
}

function smGetUsers() {
  try { return JSON.parse(localStorage.getItem(SM_USERS_KEY) || '[]'); }
  catch (e) { return []; }
}

function smSaveUsers(users) {
  localStorage.setItem(SM_USERS_KEY, JSON.stringify(users));
}

function smDisplayName(name) {
  var clean = (name || '').trim();
  if (/^amber\s+vilord$/i.test(clean)) {
    return 'Becky Moore';
  }
  return clean;
}

// ── Public API ──────────────────────────────────────────────

/**
 * Register a new user.
 * Email matching SELLER_EMAIL → role 'seller'; all others → role 'buyer'.
 * Returns { success: bool, message: string }
 */
async function registerUser(name, email, password) {
  if (!name || !email || !password) {
    return { success: false, message: 'All fields are required.' };
  }
  var users = smGetUsers();
  var normalizedEmail = email.trim().toLowerCase();
  if (users.find(function (u) { return u.email === normalizedEmail; })) {
    return { success: false, message: 'An account with this email is already registered.' };
  }
  var hashed = await smHashPassword(password);
  var role = (normalizedEmail === SELLER_EMAIL.trim().toLowerCase()) ? 'seller' : 'buyer';
  users.push({
    name: name.trim(),
    email: normalizedEmail,
    password: hashed,
    role: role,
    registeredAt: new Date().toISOString()
  });
  smSaveUsers(users);
  return { success: true };
}

/**
 * Log in an existing user.
 * Returns { success: bool, message: string, user: object|null }
 */
async function loginUser(email, password) {
  var users = smGetUsers();
  var normalizedEmail = email.trim().toLowerCase();
  var hashed = await smHashPassword(password);
  var user = users.find(function (u) {
    return u.email === normalizedEmail && u.password === hashed;
  });
  if (user) {
    sessionStorage.setItem(SM_SESSION_KEY, JSON.stringify({
      name: smDisplayName(user.name),
      email: user.email,
      role: user.role || 'buyer'
    }));
    return { success: true, user: user };
  }
  return {
    success: false,
    message: 'This email is not registered or the password is incorrect. Please register an account first.'
  };
}

/** Returns true if there is an active session for this tab. */
function isLoggedIn() {
  return !!sessionStorage.getItem(SM_SESSION_KEY);
}

/** Returns the session object { name, email, role } or null. */
function getSession() {
  try {
    var session = JSON.parse(sessionStorage.getItem(SM_SESSION_KEY));
    if (!session) return null;
    session.name = smDisplayName(session.name);
    return session;
  }
  catch (e) { return null; }
}

/** Returns true if the logged-in user is the seller. */
function isSeller() {
  var sess = getSession();
  return sess !== null && sess.role === 'seller';
}

/** Destroy the session and redirect to the login page. */
function logout() {
  sessionStorage.removeItem(SM_SESSION_KEY);
  window.location.href = 'login.html';
}

/**
 * Call at the TOP of any protected page.
 * Immediately redirects unauthenticated visitors to login.
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}
