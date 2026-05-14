export async function selectedSectionIds(input) {
  const raw = Array.isArray(input) ? input : input ? [input] : [];
  return [...new Set(raw.map((id) => Number.parseInt(id, 10)).filter((id) => id > 0))];
}

export async function assignRequirementToScope(db, requirementId, sectionIds = []) {
  if (sectionIds.length > 0) {
    for (const sectionId of sectionIds) {
      await db.execute(
        'INSERT IGNORE INTO requirement_section_scopes (requirement_id, section_id) VALUES (?, ?)',
        [requirementId, sectionId]
      );
    }

    const placeholders = sectionIds.map(() => '?').join(', ');
    await db.execute(
      `INSERT IGNORE INTO requirement_assignments (requirement_id, student_id)
       SELECT ?, id
       FROM users
       WHERE section_id IN (${placeholders})
         AND role IN ('student', 'rep', 'representative', 'executive')`,
      [requirementId, ...sectionIds]
    );
    return;
  }

  await db.execute(
    `INSERT IGNORE INTO requirement_assignments (requirement_id, student_id)
     SELECT ?, id
     FROM users
     WHERE section_id IS NOT NULL
       AND role IN ('student', 'rep', 'representative', 'executive')`,
    [requirementId]
  );
}

export async function assignExistingTasksToUser(db, userId, sectionId) {
  await db.execute(
    `INSERT IGNORE INTO requirement_assignments (requirement_id, student_id)
     SELECT r.id, ?
     FROM requirements r
     LEFT JOIN requirement_section_scopes rss ON rss.requirement_id = r.id
     WHERE rss.id IS NULL
        OR EXISTS (
          SELECT 1
          FROM requirement_section_scopes scoped
          WHERE scoped.requirement_id = r.id
            AND scoped.section_id = ?
        )`,
    [userId, sectionId]
  );
}
