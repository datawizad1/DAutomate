<?php
// includes/config.php - Configuration file for the dating automation backend

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'dating_automation');
define('DB_USER', 'root');
define('DB_PASS', 'root');
define('DB_CHARSET', 'utf8mb4');

// Application settings
define('APP_NAME', 'Dating Site Automation Tool');
define('APP_VERSION', '1.0.0');
define('DEBUG_MODE', false); // Set to false in production

// Security settings
define('JWT_SECRET', 'your-jwt-secret-key-change-this-in-production');
define('SESSION_TIMEOUT', 24 * 60 * 60); // 24 hours in seconds
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_ATTEMPT_TIMEOUT', 900); // 15 minutes

// API settings
define('API_RATE_LIMIT', 100); // requests per minute per IP
define('DEFAULT_CREDITS', 1000);
define('MAX_DAILY_LIKES', 100);
define('MAX_DAILY_MESSAGES', 50);

// File upload settings (for admin panel)
define('UPLOAD_DIR', '../uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'mp3', 'wav']);

// CORS settings
define('ALLOWED_ORIGINS', [
    'chrome-extension://',
    'moz-extension://',
    'http://localhost',
    'https://localhost'
]);

// Error reporting
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Timezone
date_default_timezone_set('UTC');

// Database connection class
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    public function commit() {
        return $this->connection->commit();
    }
    
    public function rollback() {
        return $this->connection->rollBack();
    }
}

// Utility functions
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function handleCORS() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Check if origin is allowed
    $isAllowed = false;
    foreach (ALLOWED_ORIGINS as $allowedOrigin) {
        if (strpos($origin, $allowedOrigin) === 0) {
            $isAllowed = true;
            break;
        }
    }
    
    if ($isAllowed) {
        header("Access-Control-Allow-Origin: $origin");
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }
}

function validateAccessKey($accessKey) {
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM access_keys WHERE key_value = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())");
        $stmt->execute([$accessKey]);
        
        return $stmt->fetch() !== false;
    } catch (Exception $e) {
        error_log("Access key validation error: " . $e->getMessage());
        return false;
    }
}

function logUsage($userId, $username, $actionType, $siteUrl = null, $details = null, $count = 1) {
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("
            INSERT INTO usage_logs (user_id, username, action_type, site_url, details, count, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $userId,
            $username,
            $actionType,
            $siteUrl,
            json_encode($details),
            $count,
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
    } catch (Exception $e) {
        error_log("Usage logging error: " . $e->getMessage());
    }
}

function logError($userId, $username, $context, $errorMessage, $stackTrace = '', $extensionVersion = '', $url = '') {
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("
            INSERT INTO error_logs (user_id, username, context, error_message, stack_trace, extension_version, url, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $userId,
            $username,
            $context,
            $errorMessage,
            $stackTrace,
            $extensionVersion,
            $url,
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
    } catch (Exception $e) {
        error_log("Error logging failed: " . $e->getMessage());
    }
}

function generateSecureToken($length = 32) {
    return bin2hex(random_bytes($length));
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function getUserById($userId) {
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ? AND status = 'active'");
        $stmt->execute([$userId]);
        
        return $stmt->fetch();
    } catch (Exception $e) {
        error_log("Get user error: " . $e->getMessage());
        return false;
    }
}

function getUserByUsername($username) {
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE username = ? AND status = 'active'");
        $stmt->execute([$username]);
        
        return $stmt->fetch();
    } catch (Exception $e) {
        error_log("Get user by username error: " . $e->getMessage());
        return false;
    }
}

function createSession($userId, $expiresAt = null) {
    try {
        if ($expiresAt === null) {
            $expiresAt = date('Y-m-d H:i:s', time() + SESSION_TIMEOUT);
        }
        
        $token = generateSecureToken();
        $db = Database::getInstance()->getConnection();
        
        $stmt = $db->prepare("
            INSERT INTO user_sessions (user_id, token, expires_at, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $userId,
            $token,
            $expiresAt,
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
        
        return $token;
    } catch (Exception $e) {
        error_log("Session creation error: " . $e->getMessage());
        return false;
    }
}

function validateSession($token) {
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("
            SELECT s.*, u.* FROM user_sessions s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.token = ? AND s.expires_at > NOW() AND u.status = 'active'
        ");
        $stmt->execute([$token]);
        
        return $stmt->fetch();
    } catch (Exception $e) {
        error_log("Session validation error: " . $e->getMessage());
        return false;
    }
}

function cleanupExpiredSessions() {
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("DELETE FROM user_sessions WHERE expires_at <= NOW()");
        $stmt->execute();
    } catch (Exception $e) {
        error_log("Session cleanup error: " . $e->getMessage());
    }
}

function getRateLimitKey($identifier = null) {
    if ($identifier === null) {
        $identifier = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    return 'rate_limit_' . md5($identifier);
}

function checkRateLimit($identifier = null, $limit = API_RATE_LIMIT, $window = 60) {
    // Simple file-based rate limiting (consider using Redis in production)
    $key = getRateLimitKey($identifier);
    $file = sys_get_temp_dir() . '/' . $key;
    
    $now = time();
    $requests = [];
    
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $requests = json_decode($content, true) ?: [];
    }
    
    // Remove old requests outside the window
    $requests = array_filter($requests, function($timestamp) use ($now, $window) {
        return ($now - $timestamp) < $window;
    });
    
    // Check if limit exceeded
    if (count($requests) >= $limit) {
        return false;
    }
    
    // Add current request
    $requests[] = $now;
    file_put_contents($file, json_encode($requests));
    
    return true;
}

// Initialize CORS on every request
handleCORS();

// Clean up expired sessions periodically (1% chance per request)
if (rand(1, 100) === 1) {
    cleanupExpiredSessions();
}

?>