<?php
declare(strict_types=1);

namespace App\Queries;

use PDO;

function getLandingSummary(PDO $db): array {
    $sql = "
      SELECT
        (SELECT COUNT(*) FROM sections) AS section_count,
        (SELECT COUNT(*) FROM users WHERE section_id IS NOT NULL AND role IN ('student','rep','representative','executive')) AS member_count,
        (SELECT COUNT(*) FROM users WHERE clearance_status = 'cleared' AND section_id IS NOT NULL) AS cleared_count,
        (SELECT COUNT(*) FROM requirement_assignments ra JOIN requirements r ON r.id = ra.requirement_id WHERE r.requirement_type = 'requirement' AND ra.submission_status = 'submitted') AS pending_reviews,
        (SELECT COALESCE(SUM(r.amount), 0) FROM requirement_assignments ra JOIN requirements r ON r.id = ra.requirement_id WHERE r.requirement_type IN ('payment','fine') AND ra.status = 'paid') AS collected_funds
    ";
    $stmt = $db->query($sql);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: [];
}

function getLandingSections(PDO $db): array {
    $sql = "
      SELECT s.section_name,
        COUNT(DISTINCT st.id) AS member_count,
        COUNT(CASE WHEN r.requirement_type = 'requirement' THEN ra.id END) AS requirement_total,
        COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'verified' THEN 1 ELSE 0 END), 0) AS requirement_verified,
        COUNT(CASE WHEN r.requirement_type IN ('payment', 'fine') THEN ra.id END) AS money_total,
        COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid' THEN 1 ELSE 0 END), 0) AS money_paid
      FROM sections s
      LEFT JOIN users st ON st.section_id = s.id AND st.role IN ('student','rep','representative','executive')
      LEFT JOIN requirement_assignments ra ON ra.student_id = st.id
      LEFT JOIN requirements r ON r.id = ra.requirement_id
      GROUP BY s.id, s.section_name
      ORDER BY member_count DESC, s.section_name
      LIMIT 6
    ";
    $stmt = $db->query($sql);
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function findUserByEmail(PDO $db, string $email): ?array {
    $stmt = $db->prepare("
      SELECT u.*, COALESCE(s.section_name, 'Unassigned') AS section_name
      FROM users u
      LEFT JOIN sections s ON s.id = u.section_id
      WHERE u.email = ?
      LIMIT 1
    ");
    $stmt->execute([$email]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function insertStudent(PDO $db, string $studentId, string $fullName, string $email, string $passwordHash): void {
    $stmt = $db->prepare("
      INSERT INTO users (student_id, full_name, email, password, role, section_id)
      VALUES (?, ?, ?, ?, 'student', 1)
    ");
    $stmt->execute([$studentId, $fullName, $email, $passwordHash]);
}

