<?php
session_start();
require 'config/database.php';

function getRoleHome($role) {
    if ($role === 'admin') {
        return 'admin/dashboard.php';
    }
    if ($role === 'executive') {
        return 'executive/dashboard.php';
    }
    if ($role === 'representative') {
        return 'representative/dashboard.php';
    }
    return 'student/dashboard.php';
}

function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

if(isset($_SESSION['user'])) {
    header('Location: ' . getRoleHome($_SESSION['user']['role']));
    exit();
}

$message = '';

if(isset($_POST['login'])) {
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    $role = $_POST['role'];

    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        $message = 'Invalid request.';
    } elseif(!$email || !$password || !$role) {
        $message = 'Please fill in all fields.';
    } else {
        $sql = "SELECT * FROM users WHERE email = ? AND role = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$email, $role]);

        $user = $stmt->fetch();

        if($user && password_verify($password, $user['password'])) {
            $_SESSION['user'] = $user;
            header('Location: ' . getRoleHome($user['role']));
            exit();
        }

        $message = 'Invalid email, password, or role.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | Clearance System</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/auth-fix.css">
</head>
<body>
<main class="page-content">
            <section class="card auth-card">
        <div class="login-header">

        <span class="system-label">Clearance System</span>
        <h1>Login</h1>
        <p>Choose your role to continue.</p></div>

            <?php if($message): ?>
                <div class="alert"><?php echo htmlspecialchars($message); ?></div>

            <?php endif; ?>
            <form method="POST" class="auth-form" autocomplete="on">
                <input type="hidden" name="csrf_token" value="<?php echo generateCSRFToken(); ?>">
                <label for="email">Email</label>
                <input id="email" type="email" name="email" placeholder="aeinn@gmail.com" required> 

                <label for="password">Password</label>
                <input id="password" type="password" name="password" placeholder="••••••••" required>

                <label for="role">Role</label>
                <select id="role" name="role" required>
                    <option value="">Select Role</option>
                    <option value="student">Student</option>
                    <option value="representative">Representative</option>
                    <option value="executive">Executive</option>
                    <option value="admin">Admin</option>
                </select>
                <button type="submit" name="login">Login</button>
            </form>
            <p style="margin-top: 14px;">Don't have an account? <a href="register.php" class="button-link">Register</a></p>
            <p><a href="index.php">Back to Home</a></p>
        </section>
    </main>
</body>
</html>