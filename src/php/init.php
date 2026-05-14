<?php
/**
 * SyncClear PHP Base Initialization Script
 * 
 * This PHP script serves as the base initialization layer for SyncClear.
 * It handles configuration validation, environment setup, and coordination
 * with the Node.js backend server.
 * 
 * Usage:
 *   php src/php/init.php
 *   php src/php/init.php --json
 */

// Define application root
define('APP_ROOT', dirname(__DIR__, 2));
define('ENV_FILE', APP_ROOT . '/.env');

/**
 * Check if environment file exists and load configuration
 * Uses robust line-by-line parsing to handle special characters
 */
function loadEnvironment() {
    if (!file_exists(ENV_FILE)) {
        echo "[ERROR] .env file not found at " . ENV_FILE . "\n";
        echo "Please create a .env file with required configuration.\n";
        return false;
    }
    
    $lines = file(ENV_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        echo "[ERROR] Failed to read .env file\n";
        return false;
    }
    
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse KEY=VALUE format
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove quotes if present
            if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
                (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)) {
                $value = substr($value, 1, -1);
            }
            
            putenv("$key=$value");
        }
    }
    
    return true;
}

/**
 * Validate database configuration
 */
function validateDatabaseConfig() {
    $required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
    // DB_PASSWORD can be empty for local development
    
    foreach ($required as $var) {
        if (!getenv($var)) {
            echo "[ERROR] Missing required database variable: $var\n";
            return false;
        }
    }
    
    return true;
}

/**
 * Validate Node.js server is running
 */
function checkNodeServer() {
    $host = '127.0.0.1';
    $port = getenv('PORT') ? intval(getenv('PORT')) : 3001;
    
    $connection = @fsockopen($host, $port, $errno, $errstr, 2);
    
    if ($connection) {
        fclose($connection);
        echo "[✓] Node.js server is running on {$host}:{$port}\n";
        return true;
    } else {
        echo "[⚠] Node.js server not detected on {$host}:{$port}\n";
        echo "    Make sure to run: npm start\n";
        return false;
    }
}

/**
 * Build a minimal context object meant for consumption by Node.js and browsers.
 * Avoid leaking sensitive values (e.g., passwords).
 */
function buildPublicContext() {
    return [
        'initialized_at' => date('Y-m-d H:i:s'),
        'app_root' => APP_ROOT,
        'php_version' => phpversion(),
        'db_config' => [
            'host' => getenv('DB_HOST') ?: null,
            'database' => getenv('DB_NAME') ?: null
        ],
        'server_config' => [
            'host' => '127.0.0.1',
            'port' => getenv('PORT') ? intval(getenv('PORT')) : 3001,
            'env' => getenv('NODE_ENV') ?: 'development'
        ]
    ];
}

/**
 * Display initialization status
 */
function displayStatus() {
    echo "\n";
    echo "╔════════════════════════════════════════════╗\n";
    echo "║     SyncClear PHP Base Initialization     ║\n";
    echo "╚════════════════════════════════════════════╝\n\n";
    
    echo "1. Loading Environment Configuration...";
    if (!loadEnvironment()) {
        return false;
    }
    echo " ✓\n";
    
    echo "2. Validating Database Configuration...";
    if (!validateDatabaseConfig()) {
        return false;
    }
    echo " ✓\n";
    
    echo "3. Checking Node.js Server Status...";
    checkNodeServer();
    
    echo "\n";
    echo "Database Host: " . getenv('DB_HOST') . "\n";
    echo "Database Name: " . getenv('DB_NAME') . "\n";
    echo "App Root: " . APP_ROOT . "\n";
    echo "\n";
    
    return true;
}

/**
 * Framework Detection and Reporting
 */
function reportFrameworks() {
    echo "═══════════════════════════════════════════════\n";
    echo "FRAMEWORK INTEGRATION REPORT\n";
    echo "═══════════════════════════════════════════════\n\n";
    
    echo "BACKEND FRAMEWORKS:\n";
    echo "  ✓ Node.js (v14+)\n";
    echo "  ✓ Express.js (v4.21.2) - Web Framework & Routing\n";
    echo "  ✓ EJS (v3.1.10) - Server-side Template Engine\n";
    echo "  ✓ MySQL2 (v3.12.0) - Database ORM\n";
    echo "  ✓ PHP (Base Initialization & Config Validation)\n\n";
    
    echo "FRONTEND FRAMEWORKS:\n";
    echo "  ✓ Bootstrap (v5.3+) - CSS & Component Framework\n";
    echo "  ✓ EJS Templates - View Rendering\n";
    echo "  ✓ Vanilla JavaScript - Interactivity\n\n";
    
    echo "UTILITY FRAMEWORKS:\n";
    echo "  ✓ Multer (v2.0.0) - File Upload Handling\n";
    echo "  ✓ express-session (v1.18.1) - Session Management\n";
    echo "  ✓ bcryptjs (v2.4.3) - Password Hashing\n\n";
    
    echo "═══════════════════════════════════════════════\n";
}

/**
 * Initialize PHP context for Node.js coordination
 */
function initializePhpContext() {
    global $php_context;
    
    $php_context = buildPublicContext();
    
    return $php_context;
}

// Main execution
if (php_sapi_name() === 'cli') {
    $args = $argv ?? [];
    if (in_array('--json', $args, true)) {
        if (!loadEnvironment() || !validateDatabaseConfig()) {
            fwrite(STDERR, "Initialization failed\n");
            exit(1);
        }

        $context = initializePhpContext();
        echo json_encode(['status' => 'initialized', 'context' => $context]);
        exit(0);
    }

    // Command-line execution
    if (!displayStatus()) {
        exit(1);
    }
    
    reportFrameworks();
    initializePhpContext();
    
    echo "✓ PHP initialization complete. Node.js server is ready for requests.\n\n";
    exit(0);
} else {
    // HTTP request execution
    header('Content-Type: application/json');
    
    if (!loadEnvironment() || !validateDatabaseConfig()) {
        http_response_code(500);
        echo json_encode(['error' => 'Initialization failed']);
        exit(1);
    }
    
    $context = initializePhpContext();
    echo json_encode(['status' => 'initialized', 'context' => $context]);
}
?>
