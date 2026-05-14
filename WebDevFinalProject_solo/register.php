<?php
session_start();
require 'config/database.php';

function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

$message = '';

if(isset($_POST['register'])) {
    $name = trim($_POST['name']);
    $email = trim($_POST['email']);
    $passwordPlain = $_POST['password'];
    $role = $_POST['role'];
    $student_id = trim($_POST['student_id'] ?? '');

    if($name && $email && $passwordPlain && $role) {
        if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
            $message = 'Invalid request.';
        } elseif($role === 'student' && empty($student_id)) {
            $message = 'Please provide a Student ID for students.';
        } else {
            $password = password_hash($passwordPlain, PASSWORD_DEFAULT);

            $sql = "INSERT INTO users(name,email,password,role,student_id) VALUES(?,?,?,?,?)";
            $stmt = $pdo->prepare($sql);

            try {
                $stmt->execute([
                    $name,
                    $email,
                    $password,
                    $role,
                    $role === 'student' ? $student_id : null
                ]);

                header('Location: login.php');
                exit();
            } catch(PDOException $e) {
                $message = 'Unable to register. Email may already be in use.';
            }
        }
    } else {
        $message = 'Please fill in all required fields.';
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register | Clearance System</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/auth-fix.css">
    <script>
        function toggleStudentId() {
            const role = document.getElementById('role').value;
            const studentIdField = document.getElementById('studentIdField');
            const studentIdInput = document.getElementById('student_id');
            if (role === 'student') {
                studentIdField.style.display = 'block';
                studentIdInput.required = true;
            } else {
                studentIdField.style.display = 'none';
                studentIdInput.required = false;
            }
        }
    </script>
</head>
<body>
<main class="page-content">
    <section class="card auth-card">
        <div class="panel-header" style="margin-bottom: 14px;">
            <h1 style="margin:0;">Register</h1>
            <div class="panel-status" style="font-size: 0.9rem;">Create your account</div>
        </div>

        <?php if($message): ?>
            <div class="alert"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>

        <form method="POST" class="auth-form" autocomplete="on">
            <input type="hidden" name="csrf_token" value="<?php echo generateCSRFToken(); ?>">
            <label for="name">Full Name</label>
            <input id="name" type="text" name="name" placeholder="Your name" required>

            <label for="email">Email</label>
            <input id="email" type="email" name="email" placeholder="name@school.edu" required>

            <label for="password">Password</label>
            <input id="password" type="password" name="password" placeholder="••••••••" required>

            <label for="role">Role</label>
            <select name="role" id="role" required onchange="toggleStudentId()">
                <option value="">Select Role</option>
                <option value="student">Student</option>
                <option value="representative">Representative</option>
                <option value="executive">Executive</option>
                <option value="admin">Admin</option>
            </select>

            <div id="studentIdField" style="display: none;">
                <label for="student_id">Student ID</label>
                <input id="student_id" type="text" name="student_id" placeholder="Student ID">
                <p style="margin: -10px 0 18px; color: var(--muted); font-size: 0.9rem;">
                    Use the same ID assigned by the school.
                </p>
            </div>

            <button type="submit" name="register">Register</button>
        </form>

        <p>Already have an account? <a href="login.php">Login</a></p>
        <p><a href="index.php">Back to Home</a></p>
    </section>
</main>
</body>
</html>

