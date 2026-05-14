<?php
declare(strict_types=1);
http_response_code((int)($status ?? 500));
?>
<div class="p-4 rounded-4 border border-secondary-subtle" style="background: rgba(16, 26, 42, 0.7);">
  <h1 class="h4 mb-2"><?= htmlspecialchars((string)($title ?? 'Error')) ?></h1>
  <p class="text-secondary mb-0"><?= htmlspecialchars((string)($message ?? 'Something went wrong.')) ?></p>
</div>

