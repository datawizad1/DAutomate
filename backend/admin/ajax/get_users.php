<?php
// admin/ajax/get_users.php - Get users data for admin panel
session_start();
require_once '../../includes/config.php';

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    sendJsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
}

try {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query("
        SELECT id, username, email, status, created_at, updated_at, expires_at, 
               total_likes, total_messages, credits_left, max_daily_likes, max_daily_messages
        FROM users 
        ORDER BY created_at DESC
    ");
    
    $users = $stmt->fetchAll();
    
    sendJsonResponse([
        'success' => true,
        'users' => $users
    ]);
    
} catch (Exception $e) {
    error_log("Get users error: " . $e->getMessage());
    sendJsonResponse(['success' => false, 'message' => 'Internal server error'], 500);
}
?>