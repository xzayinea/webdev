<?php
declare(strict_types=1);

namespace App;

function render(string $view, array $data = []): void {
    $data['user'] = currentUser();
    $data['success'] = flash('success');
    $data['error'] = flash('error');

    $viewFile = __DIR__ . '/views/' . $view . '.php';
    if (!file_exists($viewFile)) {
        http_response_code(500);
        echo 'View not found.';
        return;
    }

    extract($data, EXTR_SKIP);
    include __DIR__ . '/views/layout.php';
}

