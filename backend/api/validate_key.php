<?php
// api/validate_key.php - Access key validation endpoint

require_once '../includes/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
}

// Rate limiting
if (!checkRateLimit()) {
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
    
    if (empty($accessKey)) {
        sendJsonResponse(['success' => false, 'message' => 'Access key is required'], 400);
    }
    
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("
        SELECT name, expires_at, max_users, current_users 
        FROM access_keys 
        WHERE key_value = ? AND status = 'active'
    ");
    $stmt->execute([$accessKey]);
    $keyData = $stmt->fetch();
    
    if (!$keyData) {
        sendJsonResponse([
            'success' => false, 
            'message' => 'Invalid access key',
            'valid' => false
        ]);
    }
    
    // Check if key has expired
    if ($keyData['expires_at'] && strtotime($keyData['expires_at']) < time()) {
        sendJsonResponse([
            'success' => false, 
            'message' => 'Access key has expired',
            'valid' => false
        ]);
    }
    
    // Check user limit
    if ($keyData['max_users'] > 0 && $keyData['current_users'] >= $keyData['max_users']) {
        sendJsonResponse([
            'success' => false, 
            'message' => 'Maximum users limit reached for this access key',
            'valid' => false
        ]);
    }
    
    sendJsonResponse([
        'success' => true,
        'message' => 'Access key is valid',
        'valid' => true,
        'key_name' => $keyData['name'],
        'expires_at' => $keyData['expires_at']
    ]);
    
} catch (Exception $e) {
    error_log("Validate key API error: " . $e->getMessage());
    logError(null, '', 'validate_key_api', $e->getMessage(), $e->getTraceAsString());
    sendJsonResponse(['success' => false, 'message' => 'Internal server error'], 500);
}
?>