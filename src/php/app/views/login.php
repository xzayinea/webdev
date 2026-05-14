<?php
declare(strict_types=1);
$mode = ($initialMode ?? 'login') === 'register' ? 'register' : 'login';
?>
<div class="row g-4">
  <div class="col-12 col-lg-6">
    <div class="p-4 rounded-4 border border-secondary-subtle" style="background: rgba(16, 26, 42, 0.7);">
      <h1 class="h3 mb-1">SyncClear</h1>
      <p class="text-secondary mb-4"><?= $mode === 'register' ? 'Create your account to get started.' : 'Sign in to continue.' ?></p>

      <div class="<?= $mode === 'register' ? '' : 'd-none' ?>" id="register-form">
        <form method="POST" action="/auth/register" class="d-grid gap-3">
          <div class="row g-2">
            <div class="col">
              <label class="form-label">First Name</label>
              <input class="form-control" type="text" name="first_name" required>
            </div>
            <div class="col">
              <label class="form-label">Last Name</label>
              <input class="form-control" type="text" name="last_name" required>
            </div>
          </div>
          <div>
            <label class="form-label">Username (Student ID)</label>
            <input class="form-control" type="text" name="username" required>
          </div>
          <div>
            <label class="form-label">Email Address</label>
            <input class="form-control" type="email" name="email" required>
          </div>
          <div>
            <label class="form-label">Password</label>
            <input class="form-control" type="password" name="password" required>
          </div>
          <div>
            <label class="form-label">Confirm Password</label>
            <input class="form-control" type="password" name="confirm_password" required>
          </div>
          <button class="btn btn-warning" type="submit">Create Account</button>
          <p class="text-secondary mb-0">Already have an account? <a href="#" onclick="toggleForms(); return false;">Sign in</a></p>
        </form>
      </div>

      <div class="<?= $mode === 'register' ? 'd-none' : '' ?>" id="login-form">
        <form method="POST" action="/auth/login" class="d-grid gap-3">
          <div>
            <label class="form-label">Email Address</label>
            <input class="form-control" type="email" name="email" required>
          </div>
          <div>
            <label class="form-label">Password</label>
            <input class="form-control" type="password" name="password" required>
          </div>
          <button class="btn btn-warning" type="submit">Sign In</button>
          <p class="text-secondary mb-0">No account yet? <a href="#" onclick="toggleForms(); return false;">Create one</a></p>
        </form>
      </div>
    </div>
  </div>

  <div class="col-12 col-lg-6">
    <div class="p-4 rounded-4 border border-secondary-subtle h-100" style="background: rgba(16, 26, 42, 0.55);">
      <h2 class="h5">Rubric-ready stack</h2>
      <ul class="text-secondary mb-0">
        <li>PHP-first routing and sessions</li>
        <li>MySQL (PDO) data access</li>
        <li>Bootstrap UI + custom CSS</li>
        <li>PHP base script status at <code>/api/php-status</code></li>
      </ul>
    </div>
  </div>
</div>

<script>
  function toggleForms() {
    const reg = document.getElementById('register-form');
    const log = document.getElementById('login-form');
    reg.classList.toggle('d-none');
    log.classList.toggle('d-none');
  }
</script>

