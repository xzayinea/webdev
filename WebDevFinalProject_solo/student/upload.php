<?php
require_once '../config/session.php';
require_once '../config/auth.php';
require_once '../config/database.php';

if($_SESSION['user']['role'] !== 'student') {
    header('Location: ../login.php');
    exit();
}

$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'], $_POST['requirement_id'], $_POST['upload'])) {
    if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
        $message = 'Invalid request.';
    } else {
        $allowed = ['pdf', 'jpg', 'jpeg', 'png'];
        $requirement_id = (int) $_POST['requirement_id'];
        $student_id = $_SESSION['user']['id'] ?? null;

        if (!$student_id) {
            $message = 'Student not logged in';
        } elseif (!isset($_FILES['file']['error']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $message = 'File upload error';
        } else {
            $fileName = $_FILES['file']['name'];
            $tmp = $_FILES['file']['tmp_name'];
            $size = $_FILES['file']['size'];
            $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

            if (!in_array($ext, $allowed, true)) {
                $message = 'Invalid File Type. Allowed: pdf, jpg, jpeg, png';
            } elseif ($size > 5242880) {
                $message = 'File Too Large. Max 5MB';
            } else {
                $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($fileName));
                $newName = time() . '_' . $safeName;
                $path = '../uploads/' . $newName;

                $old = $pdo->prepare("SELECT file_name FROM submissions
                                       WHERE requirement_id=? AND student_id=?");
                $old->execute([$requirement_id, $student_id]);
                $oldFile = $old->fetch();

                if ($oldFile) {
                    $oldPath = '../uploads/' . $oldFile['file_name'];
                    if (file_exists($oldPath)) {
                        unlink($oldPath);
                    }

                    $update = $pdo->prepare("UPDATE submissions
                                             SET file_name=?, status='pending'
                                             WHERE requirement_id=? AND student_id=?");
                    $update->execute([$newName, $requirement_id, $student_id]);
                } else {
                    $insert = $pdo->prepare("INSERT INTO submissions
                                            (requirement_id,student_id,file_name)
                                            VALUES(?,?,?)");
                    $insert->execute([$requirement_id, $student_id, $newName]);
                }

                if (!move_uploaded_file($tmp, $path)) {
                    $message = 'Failed to move uploaded file';
                } else {
                    header('Location: dashboard.php?upload=success');
                    exit();
                }
            }
        }
    }
}

$requirements = $pdo->query("SELECT id, name FROM requirements ORDER BY name ASC")->fetchAll();

$selected_req = $_GET['requirement_id'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Requirement</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <header class="navbar">
        <div class="logo">Clearance System - Student</div>
        <nav class="nav-links">
            <a href="dashboard.php">Dashboard</a>
            <a href="payments.php">Payments</a>
            <a href="fines.php">Fines</a>
            <a href="../logout.php">Logout</a>
        </nav>
    </header>
    <main class="page-content">
        <h2>Upload Requirement Document</h2>
        <?php if ($message): ?>
            <div class="alert alert-error"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        <form method="POST" enctype="multipart/form-data" class="card">
            <input type="hidden" name="csrf_token" value="<?php echo generateCSRFToken(); ?>">
            <label for="requirement_id">Select Requirement</label>
            <select name="requirement_id" id="requirement_id" required>
                <option value="">Choose Requirement</option>
                <?php foreach ($requirements as $req): ?>
                    <option value="<?php echo $req['id']; ?>" <?php echo $selected_req == $req['id'] ? 'selected' : ''; ?>><?php echo htmlspecialchars($req['name']); ?></option>
                <?php endforeach; ?>
            </select>
            <label for="file">Select File (PDF, JPG, JPEG, PNG, max 5MB)</label>
            <input type="file" name="file" id="file" required>
            <button type="submit" name="upload">Upload</button>
        </form>
    </main>
</body>
</html>