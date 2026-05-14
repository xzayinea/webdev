export async function calculateClearanceStatus(db, userId) {
  const [rows] = await db.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status <> 'verified' THEN 1 ELSE 0 END), 0) AS open_requirements,
       COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status <> 'paid' THEN r.amount ELSE 0 END), 0) AS unpaid_balance
     FROM requirement_assignments ra
     JOIN requirements r ON r.id = ra.requirement_id
     WHERE ra.student_id = ?`,
    [userId]
  );

  const status = rows[0] || {};
  if (Number(status.open_requirements) === 0 && Number(status.unpaid_balance) <= 0) {
    return 'cleared';
  }

  return Number(status.unpaid_balance) > 0 ? 'has_fines' : 'pending';
}

export async function syncUserClearance(db, userId) {
  const status = await calculateClearanceStatus(db, userId);
  await db.execute('UPDATE users SET clearance_status = ? WHERE id = ?', [status, userId]);
  return status;
}

export async function syncAllClearance(db) {
  const [users] = await db.execute(
    `SELECT id
     FROM users
     WHERE section_id IS NOT NULL
       AND role IN ('student', 'rep', 'representative', 'executive')`
  );

  for (const user of users) {
    await syncUserClearance(db, user.id);
  }
}
