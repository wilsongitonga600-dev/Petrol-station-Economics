// ============================================================
// Auth guard — include this (after supabase-client.js) at the top of
// every protected page. Call requireAuth('attendant') or
// requireAuth('admin') or requireAuth() for "any logged-in user".
// ============================================================

async function requireAuth(requiredRole) {
  try {
    if (typeof sb === 'undefined' || !sb.auth) {
      throw new Error("Connection to the server didn't load properly. Please refresh the page and try again.");
    }

    const { data: { session } } = await sb.auth.getSession();

    if (!session) {
      window.location.href = 'index.html';
      return null;
    }

    const { data: profile, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !profile || !profile.active) {
      await sb.auth.signOut();
      window.location.href = 'index.html';
      return null;
    }

    if (requiredRole && profile.role !== requiredRole) {
      // Logged in, but wrong role for this page — send them to their own
      // dashboard instead of showing an error, so direct URL access never
      // exposes the page.
      window.location.href = profile.role === 'admin' ? 'admin-dashboard.html' : 'attendant-dashboard.html';
      return null;
    }

    return profile;
  } catch (err) {
    console.error('requireAuth failed:', err);
    alert(err.message || 'Something went wrong checking your session. Please refresh the page.');
    return null;
  }
}

async function logout() {
  try {
    if (typeof sb !== 'undefined' && sb.auth) {
      await sb.auth.signOut();
    }
  } catch (err) {
    console.error('Sign out failed:', err);
    // Fall through and redirect anyway — no point leaving them stuck.
  }
  window.location.href = 'index.html';
  }
