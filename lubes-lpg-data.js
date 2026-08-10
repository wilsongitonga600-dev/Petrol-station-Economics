// ============================================================
// Lubes & LPG sales data access — same pattern as shift-data.js.
// RLS on lubes_lpg_sales already enforces that attendants only
// see their own rows, so these queries don't need extra
// filtering beyond what makes sense functionally.
// ============================================================

async function saveLubesLpgToServer(record, editingId) {
  const { data: { user } } = await sb.auth.getUser();
  const payload = {
    user_id: user.id,
    sale_date: record.date,
    lubes: record.lubes,
    lpg: record.lpg,
    lubes_total: record.lubesTotal,
    lpg_total: record.lpgTotal,
    grand_total: record.grandTotal,
  };

  if (editingId) {
    return sb.from('lubes_lpg_sales').update(payload).eq('id', editingId).select().single();
  }
  return sb.from('lubes_lpg_sales').insert(payload).select().single();
}

async function loadMyLubesLpg(limit = 200) {
  return sb
    .from('lubes_lpg_sales')
    .select('*').order('sale_date', { ascending: false })
    .limit(limit);
}

async function loadMyLubesLpgInRange(fromDate, toDate) {
  return sb
    .from('lubes_lpg_sales')
    .select('*')
    .gte('sale_date', fromDate)
    .lte('sale_date', toDate)
    .order('sale_date', { ascending: false });
}

// Looks up this attendant's existing entry for a given date, so the
// page can load it back in for editing instead of creating a
// duplicate row when the same day is saved again.
async function loadLubesLpgForDate(dateStr) {
  return sb
    .from('lubes_lpg_sales')
    .select('*')
    .eq('sale_date', dateStr)
    .maybeSingle();
}

async function deleteLubesLpgFromServer(id) {
  return sb.from('lubes_lpg_sales').delete().eq('id', id);
}

