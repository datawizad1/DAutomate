<?php
// api/get_config.php - Site configuration endpoint

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
    
    $db = Database::getInstance()->getConnection();
    
    // Check request type
    $requestType = $input['request_type'] ?? '';
    $activeUrl = $input['active_url'] ?? '';
    
    if ($requestType === 'dating_sites') {
        // Return list of all active dating sites
        $stmt = $db->prepare("SELECT name, base_url as url, logo_url as logo FROM site_configurations WHERE status = 'active' ORDER BY name");
        $stmt->execute();
        $sites = $stmt->fetchAll();
        
        logUsage(null, '', 'config_request', null, ['type' => 'dating_sites_list']);
        
        sendJsonResponse([
            'success' => true,
            'sites' => $sites
        ]);
        
    } else if (!empty($activeUrl)) {
        // Return configuration for specific site based on active URL
        $domain = parse_url($activeUrl, PHP_URL_HOST);
        
        $stmt = $db->prepare("
            SELECT * FROM site_configurations 
            WHERE status = 'active' AND ? LIKE CONCAT('%', SUBSTRING(base_url, LOCATE('//', base_url) + 2), '%')
            ORDER BY LENGTH(base_url) DESC 
            LIMIT 1
        ");
        $stmt->execute([$domain]);
        $siteConfig = $stmt->fetch();
        
        if (!$siteConfig) {
            logUsage(null, '', 'config_request', $activeUrl, ['status' => 'site_not_supported']);
            sendJsonResponse(['success' => false, 'message' => 'Site not supported'], 404);
        }
        
        // Prepare configuration response
        $config = [
            'site_name' => $siteConfig['name'],
            'base_url' => $siteConfig['base_url'],
            'profileSelector' => $siteConfig['profile_selector'],
            'paginationSelector' => $siteConfig['pagination_selector'],
            'likeEndpoint' => $siteConfig['like_endpoint'],
            'messageEndpoint' => $siteConfig['message_endpoint'],
            'profileDetailsEndpoint' => $siteConfig['profile_details_endpoint'],
            'memberIdField' => $siteConfig['member_id_field'],
            'messageField' => $siteConfig['message_field'],
            'additionalFields' => json_decode($siteConfig['additional_fields'] ?? '{}', true),
            'sounds' => [
                'success' => $siteConfig['sound_success_url'],
                'duplicate' => $siteConfig['sound_duplicate_url'],
                'failure' => $siteConfig['sound_failure_url']
            ]
        ];
        
        logUsage(null, '', 'config_request', $activeUrl, ['site' => $siteConfig['name']]);
        
        sendJsonResponse([
            'success' => true,
            'config' => $config
        ]);
        
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Invalid request parameters'], 400);
    }
    
} catch (Exception $e) {
    error_log("Get config API error: " . $e->getMessage());
    logError(null, '', 'get_config_api', $e->getMessage(), $e->getTraceAsString());
    sendJsonResponse(['success' => false, 'message' => 'Internal server error'], 500);
}
?>