<?php
declare(strict_types=1);

namespace App\Controllers;

use App;

final class ApiController {
    public static function phpStatus(): void {
        header('Content-Type: application/json');

        $phpInitPath = realpath(__DIR__ . '/../../init.php');
        if (!$phpInitPath) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'PHP base script not found.']);
            return;
        }

        $command = 'php ' . escapeshellarg($phpInitPath) . ' --json';
        $output = shell_exec($command);
        if ($output === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Unable to execute PHP base script.']);
            return;
        }

        $data = json_decode($output, true);
        if (!is_array($data)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Invalid PHP base script response.']);
            return;
        }

        echo json_encode(['success' => true, 'data' => $data]);
    }
}

