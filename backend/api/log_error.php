<?php
// api/log_error.php - Error logging endpoint

require_once '../includes/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

// Rate limiting (more lenient for error logging)
if (!checkRateLimit($_SERVER['REMOTE_ADDR'] ?? 'unknown', 50, 60)) {
    sendJsonResponse(['success' => false, 'message' => 'Rate limit exceeded'], 429);
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendJsonResponse(['success' => false, 'message' => 'Invalid JSON input'], 400);
    }
    
    // Validate access key
    $accessKey = $input['access_key'] ?? '';
    if (!validateAccessKey($accessKey)) {
        sendJsonResponse(['success' => false, 'message' => 'Invalid or expired access key'], 401);
    }
    
    // Extract error data
    $username = sanitizeInput($input['user'] ?? '');
    $context = sanitizeInput($input['context'] ?? '');
    $errorMessage = sanitizeInput($input['error_message'] ?? '');
    $stackTrace = $input['stack_trace'] ?? '';
    $extensionVersion = sanitizeInput($input['extension_version'] ?? '');
    $url = sanitizeInput($input['url'] ?? '');
    
    // Get user ID if username provided
    $userId = null;
    if (!empty($username) && $username !== 'anonymous') {
        $user = getUserByUsername($username);
        if ($user) {
            $userId = $user['id'];
        }
    }
    
    // Log the error
    logError($userId, $username, $context, $errorMessage, $stackTrace, $extensionVersion, $url);
    
    sendJsonResponse([
        'success' => true,
        'message' => 'Error logged successfully'
    ]);
    
} catch (Exception $e) {
    error_log("Log error API error: " . $e->getMessage());
    // Don't log this error to avoid infinite loops
    sendJsonResponse(['success' => false, 'message' => 'Internal server error'], 500);
}
?>