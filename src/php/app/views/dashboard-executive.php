<?php
declare(strict_types=1);
?>
<div class="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-2">
  <div>
    <p class="text-warning small text-uppercase mb-1">Executive</p>
    <h1 class="h3 mb-0">Dashboard</h1>
    <p class="text-secondary mb-0">High-level view of sections and progress.</p>
  </div>
  <div class="d-flex gap-2">
    <a class="btn btn-outline-light btn-sm" href="/api/php-status">PHP Status</a>
  </div>
</div>

<section class="row g-3 mt-3">
  <div class="col-12 col-md-3">
    <div class="p-3 rounded-4 border border-secondary-subtle" style="background: rgba(16, 26, 42, 0.55);">
      <div class="text-secondary small">Pending Reviews</div>
      <div class="h2 mb-0"><?= htmlspecialchars((string)($summary['pending_reviews'] ?? '0')) ?></div>
    </div>
  </div>
  <div class="col-12 col-md-3">
    <div class="p-3 rounded-4 border border-secondary-subtle" style="background: rgba(16, 26, 42, 0.55);">
      <div class="text-secondary small">Collected Funds</div>
      <div class="h2 mb-0">PHP <?= number_format((float)($summary['collected_funds'] ?? 0), 2) ?></div>
    </div>
  </div>
  <div class="col-12 col-md-3">
    <div class="p-3 rounded-4 border border-secondary-subtle" style="background: rgba(16, 26, 42, 0.55);">
      <div class="text-secondary small">Members</div>
      <div class="h2 mb-0"><?= htmlspecialchars((string)($summary['member_count'] ?? '0')) ?></div>
    </div>
  </div>
  <div class="col-12 col-md-3">
    <div class="p-3 rounded-4 border border-secondary-subtle" style="background: rgba(16, 26, 42, 0.55);">
      <div class="text-secondary small">Cleared</div>
      <div class="h2 mb-0"><?= htmlspecialchars((string)($summary['cleared_count'] ?? '0')) ?></div>
    </div>
  </div>
</section>

<section class="mt-4">
  <h2 class="h5 mb-3">Sections</h2>
  <div class="table-responsive">
    <table class="table table-dark table-striped align-middle">
      <thead>
        <tr>
          <th>Section</th>
          <th class="text-end">Members</th>
          <th class="text-end">Requirements</th>
          <th class="text-end">Money</th>
        </tr>
      </thead>
      <tbody>
      <?php foreach (($sections ?? []) as $section): ?>
        <tr>
          <td><?= htmlspecialchars((string)$section['section_name']) ?></td>
          <td class="text-end"><?= htmlspecialchars((string)$section['member_count']) ?></td>
          <td class="text-end">
            <?= htmlspecialchars((string)$section['requirement_verified']) ?>/<?= htmlspecialchars((string)$section['requirement_total']) ?>
          </td>
          <td class="text-end">
            <?= htmlspecialchars((string)$section['money_paid']) ?>/<?= htmlspecialchars((string)$section['money_total']) ?>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</section>

