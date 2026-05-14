<?php
declare(strict_types=1);
?>
<section class="p-4 rounded-4 border border-secondary-subtle" style="background: rgba(16, 26, 42, 0.7);">
  <div class="d-flex flex-column flex-lg-row align-items-start justify-content-between gap-3">
    <div>
      <p class="text-uppercase text-warning small mb-1">Public homepage</p>
      <h1 class="h2 mb-2">Student Organization Clearance Platform</h1>
      <p class="text-secondary mb-0">Built with PHP-first routing + MySQL, Bootstrap UI, and a PHP base script for environment/database validation.</p>
    </div>
    <div class="d-flex gap-2">
      <?php if (empty($user)): ?>
        <a class="btn btn-warning" href="/login">Get Started</a>
      <?php else: ?>
        <a class="btn btn-warning" href="/dashboard">Go to Dashboard</a>
      <?php endif; ?>
      <a class="btn btn-outline-light" href="/api/php-status">PHP Status</a>
    </div>
  </div>
</section>

<section class="row g-3 mt-3">
  <div class="col-12 col-md-4">
    <div class="p-3 rounded-4 border border-secondary-subtle" style="background: rgba(16, 26, 42, 0.55);">
      <div class="text-secondary small">Sections</div>
      <div class="display-6"><?= htmlspecialchars((string)($summary['section_count'] ?? '0')) ?></div>
    </div>
  </div>
  <div class="col-12 col-md-4">
    <div class="p-3 rounded-4 border border-secondary-subtle" style="background: rgba(16, 26, 42, 0.55);">
      <div class="text-secondary small">Members</div>
      <div class="display-6"><?= htmlspecialchars((string)($summary['member_count'] ?? '0')) ?></div>
    </div>
  </div>
  <div class="col-12 col-md-4">
    <div class="p-3 rounded-4 border border-secondary-subtle" style="background: rgba(16, 26, 42, 0.55);">
      <div class="text-secondary small">Cleared</div>
      <div class="display-6"><?= htmlspecialchars((string)($summary['cleared_count'] ?? '0')) ?></div>
    </div>
  </div>
</section>

<section class="mt-4">
  <h2 class="h5 mb-3">Top Sections</h2>
  <div class="table-responsive">
    <table class="table table-dark table-striped align-middle">
      <thead>
        <tr>
          <th>Section</th>
          <th class="text-end">Members</th>
          <th class="text-end">Req Verified</th>
          <th class="text-end">Money Paid</th>
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
      <?php if (empty($sections)): ?>
        <tr><td colspan="4" class="text-secondary">No section data available.</td></tr>
      <?php endif; ?>
      </tbody>
    </table>
  </div>
</section>

