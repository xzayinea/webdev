<?php
declare(strict_types=1);

namespace App;

function flash(string $type, ?string $message = null): array {
    if (!isset($_SESSION['flash'])) $_SESSION['flash'] = [];
    if (!isset($_SESSION['flash'][$type])) $_SESSION['flash'][$type] = [];

    if ($message === null) {
        $messages = $_SESSION['flash'][$type];
        $_SESSION['flash'][$type] = [];
        return $messages;
    }

    $_SESSION['flash'][$type][] = $message;
    return $_SESSION['flash'][$type];
}

function currentUser(): ?array {
    return $_SESSION['user'] ?? null;
}

