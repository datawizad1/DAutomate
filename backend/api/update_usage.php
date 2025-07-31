<?php
// api/update_usage.php - Usage tracking endpoint

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
    if (!validateAccessKey($accessKey)) {
        sendJsonResponse(['success' => false, 'message' => 'Invalid or expired access key'], 401);
    }
    
    // Validate required fields
    $username = sanitizeInput($input['username'] ?? '');
    $type = sanitizeInput($input['type'] ?? '');
    $count = intval($input['count'] ?? 0);
    
    if (empty($username) || empty($type) || $count <= 0) {
        sendJsonResponse(['success' => false, 'message' => 'Username, type, and count are required'], 400);
    }
    
    // Validate type
    if (!in_array($type, ['likes', 'messages'])) {
        sendJsonResponse(['success' => false, 'message' => 'Invalid usage type'], 400);
    }
    
    // Get user
    $user = getUserByUsername($username);
    if (!$user) {
        sendJsonResponse(['success' => false, 'message' => 'User not found'], 404);
    }
    
    $db = Database::getInstance()->getConnection();
    $db->beginTransaction();
    
    try {
        // Update user totals
        if ($type === 'likes') {
            $stmt = $db->prepare("UPDATE users SET total_likes = total_likes + ? WHERE id = ?");
            $stmt->execute([$count, $user['id']]);
            
            // Log the usage
            logUsage($user['id'], $username, 'like', null, ['count' => $count], $count);
            
        } else if ($type === 'messages') {
            $stmt = $db->prepare("UPDATE users SET total_messages = total_messages + ? WHERE id = ?");
            $stmt->execute([$count, $user['id']]);
            
            // Log the usage
            logUsage($user['id'], $username, 'message', null, ['count' => $count], $count);
        }
        
        // Update credits if applicable
        if ($user['credits_left'] > 0) {
            $creditsUsed = $count; // 1 credit per action
            $stmt = $db->prepare("UPDATE users SET credits_left = GREATEST(0, credits_left - ?) WHERE id = ?");
            $stmt->execute([$creditsUsed, $user['id']]);
        }
        
        $db->commit();
        
        // Get updated user data
        $updatedUser = getUserById($user['id']);
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Usage updated successfully',
            'user' => [
                'total_likes' => $updatedUser['total_likes'],
                'total_messages' => $updatedUser['total_messages'],
                'credits_left' => $updatedUser['credits_left']
            ]
        ]);
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Update usage API error: " . $e->getMessage());
    logError(null, $username ?? '', 'update_usage_api', $e->getMessage(), $e->getTraceAsString());
    sendJsonResponse(['success' => false, 'message' => 'Internal server error'], 500);
}
?>