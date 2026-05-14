<?php
require '../config/database.php';

$path = __DIR__ . '/migrations/*.sql';
$files = glob($path);

if(!$files) {
    echo 'No migration files found in database/migrations.';
    exit;
}

foreach($files as $file) {
    $sql = file_get_contents($file);

    try {
        $pdo->exec($sql);
        echo "Migrated: " . basename($file) . "<br>";
    } catch(PDOException $e) {
        echo "Error migrating " . basename($file) . ": " . $e->getMessage() . "<br>";
    }
}
?>
