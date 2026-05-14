<?php
declare(strict_types=1);

namespace App;

use PDO;
use Throwable;

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/flash.php';
require_once __DIR__ . '/views.php';
require_once __DIR__ . '/queries.php';
require_once __DIR__ . '/controllers/auth-controller.php';
require_once __DIR__ . '/controllers/dashboard-controller.php';
require_once __DIR__ . '/controllers/api-controller.php';

session_start();

loadEnv(__DIR__ . '/../../../.env');

function db(): PDO {
    return Db\pdo();
}

function redirect(string $path): void {
    header('Location: ' . $path, true, 302);
}

function abort(int $status, string $title, string $message): void {
    http_response_code($status);
    render('error', [
        'title' => $title,
        'status' => $status,
        'message' => $message
    ]);
    exit;
}

