export function getPagination(query, defaults = {}) {
  const pageSize = Number.parseInt(defaults.pageSize || query.page_size || 10, 10);
  const safePageSize = [10, 25, 50, 100].includes(pageSize) ? pageSize : 10;
  const page = Math.max(Number.parseInt(query.page || '1', 10) || 1, 1);

  return {
    page,
    pageSize: safePageSize,
    limit: safePageSize,
    offset: (page - 1) * safePageSize
  };
}

export function buildPagination(total, pagination) {
  const totalPages = Math.max(Math.ceil(Number(total || 0) / pagination.pageSize), 1);
  return {
    ...pagination,
    total: Number(total || 0),
    totalPages,
    hasPrevious: pagination.page > 1,
    hasNext: pagination.page < totalPages
  };
}

export function pageUrl(req, page) {
  const params = new URLSearchParams(req.query);
  params.set('page', String(page));
  return `${req.path}?${params.toString()}`;
}
