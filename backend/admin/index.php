<?php
// admin/index.php - Admin panel main page
session_start();
require_once '../includes/config.php';

// Check if admin is logged in
if (!isset($_SESSION['admin_id']) || !isset($_SESSION['admin_username'])) {
    header('Location: login.php');
    exit;
}

// Get admin info
$db = Database::getInstance()->getConnection();
$stmt = $db->prepare("SELECT * FROM admin_users WHERE id = ? AND status = 'active'");
$stmt->execute([$_SESSION['admin_id']]);
$admin = $stmt->fetch();

if (!$admin) {
    session_destroy();
    header('Location: login.php');
    exit;
}

// Get dashboard statistics
$stats = [];

// Total users
$stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
$stats['total_users'] = $stmt->fetch()['count'];

// Total sites
$stmt = $db->query("SELECT COUNT(*) as count FROM site_configurations WHERE status = 'active'");
$stats['total_sites'] = $stmt->fetch()['count'];

// Total access keys
$stmt = $db->query("SELECT COUNT(*) as count FROM access_keys WHERE status = 'active'");
$stats['total_keys'] = $stmt->fetch()['count'];

// Recent errors (last 24 hours)
$stmt = $db->query("SELECT COUNT(*) as count FROM error_logs WHERE timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)");
$stats['recent_errors'] = $stmt->fetch()['count'];

// Recent activity (last 24 hours)
$stmt = $db->query("SELECT COUNT(*) as count FROM usage_logs WHERE timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)");
$stats['recent_activity'] = $stmt->fetch()['count'];

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Dating Site Automation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .header .user-info {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: #667eea;
            color: white;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .nav-tabs {
            display: flex;
            background: white;
            border-radius: 8px;
            margin-bottom: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .nav-tab {
            flex: 1;
            padding: 1rem;
            background: none;
            border: none;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
        }
        
        .nav-tab:hover {
            background: #f8f9fa;
        }
        
        .nav-tab.active {
            background: #667eea;
            color: white;
        }
        
        .tab-content {
            display: none;
            background: white;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .tab-content.active {
            display: block;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: #667eea;
        }
        
        .stat-label {
            color: #666;
            margin-top: 0.5rem;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        
        .table th,
        .table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        
        .table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        .table tbody tr:hover {
            background: #f8f9fa;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        
        .form-control {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 0.875rem;
        }
        
        .form-control:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.25);
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
        }
        
        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .modal-title {
            font-size: 1.25rem;
            font-weight: 600;
        }
        
        .close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #999;
        }
        
        .alert {
            padding: 0.75rem 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
        }
        
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-danger {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .badge {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .badge-success {
            background: #28a745;
            color: white;
        }
        
        .badge-warning {
            background: #ffc107;
            color: #212529;
        }
        
        .badge-danger {
            background: #dc3545;
            color: white;
        }
        
        .text-center {
            text-align: center;
        }
        
        .mt-2 {
            margin-top: 1rem;
        }
        
        .mb-0 {
            margin-bottom: 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Dating Site Automation - Admin Panel</h1>
        <div class="user-info">
            <span>Welcome, <?php echo htmlspecialchars($admin['username']); ?></span>
            <a href="logout.php" class="btn btn-secondary">Logout</a>
        </div>
    </div>

    <div class="container">
        <!-- Statistics Dashboard -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value"><?php echo $stats['total_users']; ?></div>
                <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?php echo $stats['total_sites']; ?></div>
                <div class="stat-label">Dating Sites</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?php echo $stats['total_keys']; ?></div>
                <div class="stat-label">Access Keys</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?php echo $stats['recent_errors']; ?></div>
                <div class="stat-label">Recent Errors (24h)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?php echo $stats['recent_activity']; ?></div>
                <div class="stat-label">Recent Activity (24h)</div>
            </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showTab('users')">Users</button>
            <button class="nav-tab" onclick="showTab('sites')">Dating Sites</button>
            <button class="nav-tab" onclick="showTab('keys')">Access Keys</button>
            <button class="nav-tab" onclick="showTab('logs')">Logs</button>
            <button class="nav-tab" onclick="showTab('errors')">Errors</button>
        </div>

        <!-- Users Tab -->
        <div id="users" class="tab-content active">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3>User Management</h3>
                <button class="btn btn-primary" onclick="showAddUserModal()">Add User</button>
            </div>
            
            <div id="users-table">
                <!-- Users will be loaded via AJAX -->
            </div>
        </div>

        <!-- Dating Sites Tab -->
        <div id="sites" class="tab-content">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3>Dating Sites Configuration</h3>
                <button class="btn btn-primary" onclick="showAddSiteModal()">Add Site</button>
            </div>
            
            <div id="sites-table">
                <!-- Sites will be loaded via AJAX -->
            </div>
        </div>

        <!-- Access Keys Tab -->
        <div id="keys" class="tab-content">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3>Access Keys Management</h3>
                <button class="btn btn-primary" onclick="showAddKeyModal()">Create Key</button>
            </div>
            
            <div id="keys-table">
                <!-- Keys will be loaded via AJAX -->
            </div>
        </div>

        <!-- Logs Tab -->
        <div id="logs" class="tab-content">
            <h3>Usage Logs</h3>
            <div class="form-group">
                <label>Filter by Action Type:</label>
                <select id="logFilter" class="form-control" style="width: 200px;" onchange="loadLogs()">
                    <option value="">All Actions</option>
                    <option value="login">Login</option>
                    <option value="like">Likes</option>
                    <option value="message">Messages</option>
                    <option value="config_request">Config Requests</option>
                </select>
            </div>
            
            <div id="logs-table">
                <!-- Logs will be loaded via AJAX -->
            </div>
        </div>

        <!-- Errors Tab -->
        <div id="errors" class="tab-content">
            <h3>Error Logs</h3>
            <div class="form-group">
                <label>Filter by Status:</label>
                <select id="errorFilter" class="form-control" style="width: 200px;" onchange="loadErrors()">
                    <option value="">All Errors</option>
                    <option value="new">New</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="ignored">Ignored</option>
                </select>
            </div>
            
            <div id="errors-table">
                <!-- Errors will be loaded via AJAX -->
            </div>
        </div>
    </div>

    <!-- Modals -->
    <div id="userModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Add/Edit User</h5>
                <button class="close" onclick="closeModal('userModal')">&times;</button>
            </div>
            <form id="userForm">
                <input type="hidden" id="userId" name="id">
                <div class="form-group">
                    <label>Username:</label>
                    <input type="text" id="userUsername" name="username" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" id="userEmail" name="email" class="form-control">
                </div>
                <div class="form-group">
                    <label>Password:</label>
                    <input type="password" id="userPassword" name="password" class="form-control">
                    <small class="text-muted">Leave blank to keep current password</small>
                </div>
                <div class="form-group">
                    <label>Expires At:</label>
                    <input type="datetime-local" id="userExpiresAt" name="expires_at" class="form-control">
                </div>
                <div class="form-group">
                    <label>Credits:</label>
                    <input type="number" id="userCredits" name="credits_left" class="form-control" min="0">
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <select id="userStatus" name="status" class="form-control">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>
                <div class="text-center mt-2">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('userModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        </div>
    </div>

    <div id="siteModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Add/Edit Dating Site</h5>
                <button class="close" onclick="closeModal('siteModal')">&times;</button>
            </div>
            <form id="siteForm">
                <input type="hidden" id="siteId" name="id">
                <div class="form-group">
                    <label>Site Name:</label>
                    <input type="text" id="siteName" name="name" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Base URL:</label>
                    <input type="url" id="siteBaseUrl" name="base_url" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Logo URL:</label>
                    <input type="url" id="siteLogoUrl" name="logo_url" class="form-control">
                </div>
                <div class="form-group">
                    <label>Like Endpoint:</label>
                    <input type="text" id="siteLikeEndpoint" name="like_endpoint" class="form-control">
                </div>
                <div class="form-group">
                    <label>Message Endpoint:</label>
                    <input type="text" id="siteMessageEndpoint" name="message_endpoint" class="form-control">
                </div>
                <div class="form-group">
                    <label>Sound URLs:</label>
                    <input type="url" id="siteSoundSuccess" name="sound_success_url" class="form-control" placeholder="Success sound URL">
                    <input type="url" id="siteSoundDuplicate" name="sound_duplicate_url" class="form-control mt-1" placeholder="Duplicate sound URL">
                    <input type="url" id="siteSoundFailure" name="sound_failure_url" class="form-control mt-1" placeholder="Failure sound URL">
                </div>
                <div class="form-group">
                    <label>Status:</label>
                    <select id="siteStatus" name="status" class="form-control">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div class="text-center mt-2">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('siteModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        </div>
    </div>

    <div id="keyModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create Access Key</h5>
                <button class="close" onclick="closeModal('keyModal')">&times;</button>
            </div>
            <form id="keyForm">
                <div class="form-group">
                    <label>Key Name:</label>
                    <input type="text" id="keyName" name="name" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Expires At:</label>
                    <input type="datetime-local" id="keyExpiresAt" name="expires_at" class="form-control">
                </div>
                <div class="form-group">
                    <label>Max Users:</label>
                    <input type="number" id="keyMaxUsers" name="max_users" class="form-control" min="-1" value="-1">
                    <small class="text-muted">-1 for unlimited</small>
                </div>
                <div class="text-center mt-2">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('keyModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Tab switching
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.nav-tab').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
            
            // Load data for the tab
            switch(tabName) {
                case 'users':
                    loadUsers();
                    break;
                case 'sites':
                    loadSites();
                    break;
                case 'keys':
                    loadKeys();
                    break;
                case 'logs':
                    loadLogs();
                    break;
                case 'errors':
                    loadErrors();
                    break;
            }
        }

        // Modal functions
        function showAddUserModal() {
            document.getElementById('userForm').reset();
            document.getElementById('userId').value = '';
            document.querySelector('#userModal .modal-title').textContent = 'Add User';
            document.getElementById('userModal').classList.add('show');
        }

        function showEditUserModal(user) {
            document.getElementById('userId').value = user.id;
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userExpiresAt').value = user.expires_at ? user.expires_at.replace(' ', 'T') : '';
            document.getElementById('userCredits').value = user.credits_left;
            document.getElementById('userStatus').value = user.status;
            document.querySelector('#userModal .modal-title').textContent = 'Edit User';
            document.getElementById('userModal').classList.add('show');
        }

        function showAddSiteModal() {
            document.getElementById('siteForm').reset();
            document.getElementById('siteId').value = '';
            document.querySelector('#siteModal .modal-title').textContent = 'Add Dating Site';
            document.getElementById('siteModal').classList.add('show');
        }

        function showEditSiteModal(site) {
            document.getElementById('siteId').value = site.id;
            document.getElementById('siteName').value = site.name;
            document.getElementById('siteBaseUrl').value = site.base_url;
            document.getElementById('siteLogoUrl').value = site.logo_url || '';
            document.getElementById('siteLikeEndpoint').value = site.like_endpoint || '';
            document.getElementById('siteMessageEndpoint').value = site.message_endpoint || '';
            document.getElementById('siteSoundSuccess').value = site.sound_success_url || '';
            document.getElementById('siteSoundDuplicate').value = site.sound_duplicate_url || '';
            document.getElementById('siteSoundFailure').value = site.sound_failure_url || '';
            document.getElementById('siteStatus').value = site.status;
            document.querySelector('#siteModal .modal-title').textContent = 'Edit Dating Site';
            document.getElementById('siteModal').classList.add('show');
        }

        function showAddKeyModal() {
            document.getElementById('keyForm').reset();
            document.querySelector('#keyModal .modal-title').textContent = 'Create Access Key';
            document.getElementById('keyModal').classList.add('show');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('show');
        }

        // AJAX functions will be implemented in a separate admin.js file
        // Load initial data
        document.addEventListener('DOMContentLoaded', function() {
            loadUsers();
        });
    </script>
    <script src="admin.js"></script>
</body>
</html>