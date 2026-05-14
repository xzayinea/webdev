<?php
require '../config/database.php';
require '../config/session.php';
require '../config/auth.php';

if($_SESSION['user']['role'] !== 'representative') {
    header('Location: ../login.php');
    exit();
}

if(isset($_GET['verify'])) {
    $submission_id = (int)$_GET['verify'];
    $rep_id = $_SESSION['user']['id'];

    $sql = "UPDATE submissions SET status='verified', verified_by=? WHERE id=?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$rep_id, $submission_id]);

    $log = $pdo->prepare("INSERT INTO audit_logs(user_id,action,description) VALUES(?,?,?)");
    $log->execute([
        $rep_id,
        'VERIFY',
        'Representative verified submission ID ' . $submission_id
    ]);
}

header('Location: dashboard.php');
exit();
