export function normalizeDashboardHighlights(rows, maxSlots = 3) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const bestByPosition = new Map();

  for (const row of rows) {
    const position = Number(row?.card_position);
    if (!Number.isInteger(position) || position < 1 || position > maxSlots) continue;

    const existing = bestByPosition.get(position);
    if (!existing) {
      bestByPosition.set(position, row);
      continue;
    }

    const existingUpdated = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
    const candidateUpdated = row?.updated_at ? new Date(row.updated_at).getTime() : 0;
    if (candidateUpdated !== existingUpdated) {
      if (candidateUpdated > existingUpdated) bestByPosition.set(position, row);
      continue;
    }

    const existingId = Number(existing?.id) || 0;
    const candidateId = Number(row?.id) || 0;
    if (candidateId > existingId) bestByPosition.set(position, row);
  }

  const normalized = [];
  for (let position = 1; position <= maxSlots; position++) {
    const row = bestByPosition.get(position);
    if (row) normalized.push(row);
  }
  return normalized;
}

export function hasAttemptedDashboardHighlightChanges(highlight = {}) {
  const description = String(highlight?.description || '').trim();
  const eventDate = String(highlight?.event_date || '').trim();
  const imagePath = String(highlight?.image_path || '').trim();
  return Boolean(description) || Boolean(eventDate) || Boolean(imagePath);
}
