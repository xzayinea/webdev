<?php
require '../config/database.php';
require '../config/session.php';

$student_id = $_SESSION['user']['id'];

$pendingRequirements = $pdo->prepare(
    "SELECT COUNT(*) FROM submissions
     WHERE student_id=?
     AND status != 'verified'"
);

$pendingRequirements->execute([$student_id]);
$requirements = $pendingRequirements->fetchColumn();

$unpaidPayments = $pdo->prepare(
    "SELECT COUNT(*) FROM payments
     WHERE student_id=?
     AND status='unpaid'"
);

$unpaidPayments->execute([$student_id]);
$payments = $unpaidPayments->fetchColumn();

$unpaidFines = $pdo->prepare(
    "SELECT COUNT(*) FROM fines
     WHERE student_id=?
     AND status='unpaid'"
);

$unpaidFines->execute([$student_id]);
$fines = $unpaidFines->fetchColumn();

if($requirements == 0 && $payments == 0 && $fines == 0) {
    $status = 'CLEARED';
}

elseif($fines > 0 || $payments > 0) {
    $status = 'HAS FINES';
}

else {
    $status = 'PENDING';
}

echo "Clearance Status: " . $status;
?>