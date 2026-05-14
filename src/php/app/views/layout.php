<?php
declare(strict_types=1);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars((string)($title ?? 'SyncClear')) ?></title>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/landing.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="bg-dark text-light" style="font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;">
  <header class="container py-3 d-flex justify-content-between align-items-center">
    <a href="/" class="text-decoration-none text-warning fw-bold">SyncClear</a>
    <nav class="d-flex gap-3 align-items-center">
      <?php if (!empty($user)): ?>
        <a class="text-decoration-none text-light" href="/dashboard">Dashboard</a>
        <form method="POST" action="/auth/logout" class="m-0">
          <button type="submit" class="btn btn-outline-warning btn-sm">Logout</button>
        </form>
      <?php else: ?>
        <a class="btn btn-warning btn-sm" href="/login">Login</a>
      <?php endif; ?>
    </nav>
  </header>

  <main class="container pb-5">
    <?php if (!empty($success)): ?>
      <div class="alert alert-success"><?= htmlspecialchars((string)$success[0]) ?></div>
    <?php endif; ?>
    <?php if (!empty($error)): ?>
      <div class="alert alert-danger"><?= htmlspecialchars((string)$error[0]) ?></div>
    <?php endif; ?>

    <?php include $viewFile; ?>
  </main>
</body>
</html>

