<?php
require 'config/database.php';

$errors = [];

$accomplishments = [];
$events = [];

try {
    $accomplishments = $pdo->query("SELECT title, description FROM homepage_items WHERE item_type = 'accomplishment' ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    $events = $pdo->query("SELECT title, description FROM homepage_items WHERE item_type = 'event' ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $errors[] = 'Unable to load homepage content.';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Clearance System</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <nav class="navbar">
        <div class="logo">Clearance System</div>
        <a href="login.php">Login</a>
    </nav>
    <main style="padding: 32px;">
        <section>
            <h1>Welcome to Student Clearance System</h1>
            <?php if ($errors): ?>
                <div class="alert alert-error">
                    <?php echo htmlspecialchars(implode(' ', $errors)); ?>
                </div>
            <?php endif; ?>

            <?php if ($accomplishments): ?>
                <h2>Accomplishments</h2>
                <?php foreach ($accomplishments as $item): ?>
                    <div class="card" style="margin-bottom: 16px; padding: 16px; background: var(--surface); border-radius: 8px;">
                        <h3><?php echo htmlspecialchars($item['title']); ?></h3>
                        <p><?php echo htmlspecialchars($item['description']); ?></p>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>

            <?php if ($events): ?>
                <h2>Events</h2>
                <?php foreach ($events as $item): ?>
                    <div class="card" style="margin-bottom: 16px; padding: 16px; background: var(--surface); border-radius: 8px;">
                        <h3><?php echo htmlspecialchars($item['title']); ?></h3>
                        <p><?php echo htmlspecialchars($item['description']); ?></p>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </section>
    </main>
</body>
</html>