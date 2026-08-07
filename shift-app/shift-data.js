// ============================================================
// Shift data access — RLS on the server already enforces that attendants
// only see their own rows, so these queries don't need extra filtering
// beyond what makes sense functionally (they'd fail closed even if a
// user_id filter were omitted by mistake).
// ============================================================

async function saveShiftToServer(record, editingId) {
  const { data: { user } } = await sb.auth.getUser();

  const payload = {
    user_id: user.id,
    shift_date: record.date,
    shift_name: record.shiftName,
    fuels: record.fuels,
    money: record.money,
    total_fuel_sales: record.totalFuelSales,
    total_money: record.totalMoney,
    variance: record.variance,
    is_checkpoint: !!record.isCheckpoint,
  };

  if (editingId) {
    return sb
      .from('shift_reconciliations')
      .update(payload)
      .eq('id', editingId)
      .select()
      .single();
  }

  return sb
    .from('shift_reconciliations')
    .insert(payload)
    .select()
    .single();
}


async function loadMyShifts(limit = 200) {
  return sb
    .from('shift_reconciliations')
    .select('*')
    .order('shift_date', { ascending: false })
    .limit(limit);
}


async function loadMyShiftsInRange(fromDate, toDate) {
  // Excludes mid-shift checkpoints — this is used for dashboard stats,
  // which should only ever reflect finalized shift totals.
  return sb
    .from('shift_reconciliations')
    .select('*')
    .gte('shift_date', fromDate)
    .lte('shift_date', toDate)
    .eq('is_checkpoint', false)
    .order('shift_date', { ascending: false });
}


// ============================================================
// Lubes & LPG Supabase functions
// ============================================================

async function loadLubesLpgShifts(limit = 200) {
  return await sb
    .from('lubes_lpg_sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}


async function loadLubesLpgByDate(date) {
  return await sb
    .from('lubes_lpg_sales')
    .select('*')
    .eq('date', date)
    .maybeSingle();
}


async function saveLubesLpgShift(record, id) {
  if (id) {
    return await sb
      .from('lubes_lpg_sales')
      .update(record)
      .eq('id', id)
      .select()
      .single();
  }

  return await sb
    .from('lubes_lpg_sales')
    .insert(record)
    .select()
    .single();
}


async function deleteLubesLpgShift(id) {
  return await sb
    .from('lubes_lpg_sales')
    .delete()
    .eq('id', id);
}


// ============================================================
// Shift deletion
// ============================================================

async function deleteShiftFromServer(id) {
  return sb
    .from('shift_reconciliations')
    .delete()
    .eq('id', id);
}


// ============================================================
// Activity logging
// ============================================================

async function logActivity(action, details) {
  const { data: { user } } = await sb.auth.getUser();

  if (!user) return;

  await sb
    .from('activity_logs')
    .insert({
      user_id: user.id,
      action,
      details: details || {}
    });
            }
