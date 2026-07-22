// ============================================================
// Auth guard — include this (after supabase-client.js) at the top of
// every protected page. Call requireAuth('attendant') or
// requireAuth('admin') or requireAuth() for "any logged-in user".
// ============================================================

async function requireAuth(requiredRole) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || !profile.active) {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
    return null;
  }

  if (requiredRole && profile.role !== requiredRole) {
    // Logged in, but wrong role for this page — send them to their own dashboard
    // instead of showing an error, so direct URL access never exposes the page.
    window.location.href = profile.role === 'admin' ? 'admin-dashboard.html' : 'attendant-dashboard.html';
    return null;
  }

  return profile;
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}
