<?php
// api/login.php - User authentication endpoint

require_once '../includes/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

// Rate limiting
if (!checkRateLimit($_SERVER['REMOTE_ADDR'] ?? 'unknown', 10, 300)) { // 10 attempts per 5 minutes
    sendJsonResponse(['success' => false, 'message' => 'Too many login attempts. Please try again later.'], 429);
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['success' => false, 'message' => 'Invalid JSON input'], 400);
    }
    
    // Validate required fields
    $username = sanitizeInput($input['username'] ?? '');
    $password = $input['password'] ?? '';
    $accessKey = $input['access_key'] ?? '';
    
    if (empty($username) || empty($password) || empty($accessKey)) {
        sendJsonResponse(['success' => false, 'message' => 'Username, password, and access key are required'], 400);
    }
    
    // Validate access key
    if (!validateAccessKey($accessKey)) {
        logUsage(null, $username, 'login', null, ['status' => 'invalid_access_key']);
        sendJsonResponse(['success' => false, 'message' => 'Invalid or expired access key'], 401);
    }
    
    // Get user from database
    $user = getUserByUsername($username);
    
    if (!$user) {
        logUsage(null, $username, 'login', null, ['status' => 'user_not_found']);
        sendJsonResponse(['success' => false, 'message' => 'Invalid username or password'], 401);
    }
    
    // Verify password
    if (!verifyPassword($password, $user['password_hash'])) {
        logUsage($user['id'], $username, 'login', null, ['status' => 'invalid_password']);
        sendJsonResponse(['success' => false, 'message' => 'Invalid username or password'], 401);
    }
    
    // Check if account is expired
    if ($user['expires_at'] && strtotime($user['expires_at']) < time()) {
        logUsage($user['id'], $username, 'login', null, ['status' => 'account_expired']);
        sendJsonResponse(['success' => false, 'message' => 'Account has expired'], 401);
    }
    
    // Create session token
    $token = createSession($user['id']);
    
    if (!$token) {
        sendJsonResponse(['success' => false, 'message' => 'Failed to create session'], 500);
    }
    
    // Log successful login
    logUsage($user['id'], $username, 'login', null, ['status' => 'success']);
    
    // Prepare user data (remove sensitive information)
    $userData = [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'created_at' => $user['created_at'],
        'expires_at' => $user['expires_at'],
        'total_likes' => $user['total_likes'],
        'total_messages' => $user['total_messages'],
        'credits_left' => $user['credits_left'],
        'max_daily_likes' => $user['max_daily_likes'],
        'max_daily_messages' => $user['max_daily_messages']
    ];
    
    sendJsonResponse([
        'success' => true,
        'message' => 'Login successful',
        'user' => $userData,
        'token' => $token
    ]);
    
} catch (Exception $e) {
    error_log("Login API error: " . $e->getMessage());
    logError(null, $username ?? '', 'login_api', $e->getMessage(), $e->getTraceAsString());
    sendJsonResponse(['success' => false, 'message' => 'Internal server error'], 500);
}
?>