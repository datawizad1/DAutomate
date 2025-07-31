// admin/admin.js - Admin panel JavaScript functionality

// Load users data
async function loadUsers() {
    try {
        const response = await fetch('ajax/get_users.php');
        const data = await response.json();
        
        if (data.success) {
            renderUsersTable(data.users);
        } else {
            showAlert('Error loading users: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error loading users: ' + error.message, 'danger');
    }
}

function renderUsersTable(users) {
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Total Likes</th>
                    <th>Total Messages</th>
                    <th>Credits Left</th>
                    <th>Expires At</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.email || '-'}</td>
                        <td><span class="badge badge-${getStatusColor(user.status)}">${user.status}</span></td>
                        <td>${user.total_likes}</td>
                        <td>${user.total_messages}</td>
                        <td>${user.credits_left}</td>
                        <td>${user.expires_at || 'Never'}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="showEditUserModal(${JSON.stringify(user).replace(/"/g, '&quot;')})">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('users-table').innerHTML = html;
}

// Load sites data
async function loadSites() {
    try {
        const response = await fetch('ajax/get_sites.php');
        const data = await response.json();
        
        if (data.success) {
            renderSitesTable(data.sites);
        } else {
            showAlert('Error loading sites: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error loading sites: ' + error.message, 'danger');
    }
}

function renderSitesTable(sites) {
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Base URL</th>
                    <th>Status</th>
                    <th>Like Endpoint</th>
                    <th>Message Endpoint</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${sites.map(site => `
                    <tr>
                        <td>${site.id}</td>
                        <td>${site.name}</td>
                        <td><a href="${site.base_url}" target="_blank">${site.base_url}</a></td>
                        <td><span class="badge badge-${getStatusColor(site.status)}">${site.status}</span></td>
                        <td>${site.like_endpoint || '-'}</td>
                        <td>${site.message_endpoint || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="showEditSiteModal(${JSON.stringify(site).replace(/"/g, '&quot;')})">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteSite(${site.id})">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('sites-table').innerHTML = html;
}

// Load access keys data
async function loadKeys() {
    try {
        const response = await fetch('ajax/get_keys.php');
        const data = await response.json();
        
        if (data.success) {
            renderKeysTable(data.keys);
        } else {
            showAlert('Error loading keys: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error loading keys: ' + error.message, 'danger');
    }
}

function renderKeysTable(keys) {
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Key Value</th>
                    <th>Status</th>
                    <th>Max Users</th>
                    <th>Current Users</th>
                    <th>Expires At</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${keys.map(key => `
                    <tr>
                        <td>${key.id}</td>
                        <td>${key.name}</td>
                        <td><code>${key.key_value.substring(0, 20)}...</code></td>
                        <td><span class="badge badge-${getStatusColor(key.status)}">${key.status}</span></td>
                        <td>${key.max_users === -1 ? 'Unlimited' : key.max_users}</td>
                        <td>${key.current_users}</td>
                        <td>${key.expires_at || 'Never'}</td>
                        <td>
                            <button class="btn btn-sm btn-warning" onclick="revokeKey(${key.id})">Revoke</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteKey(${key.id})">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('keys-table').innerHTML = html;
}

// Load logs data
async function loadLogs() {
    const filter = document.getElementById('logFilter').value;
    
    try {
        const response = await fetch(`ajax/get_logs.php?filter=${encodeURIComponent(filter)}`);
        const data = await response.json();
        
        if (data.success) {
            renderLogsTable(data.logs);
        } else {
            showAlert('Error loading logs: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error loading logs: ' + error.message, 'danger');
    }
}

function renderLogsTable(logs) {
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Site URL</th>
                    <th>Count</th>
                    <th>IP Address</th>
                    <th>Timestamp</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(log => `
                    <tr>
                        <td>${log.id}</td>
                        <td>${log.username || 'Unknown'}</td>
                        <td><span class="badge badge-secondary">${log.action_type}</span></td>
                        <td>${log.site_url || '-'}</td>
                        <td>${log.count}</td>
                        <td>${log.ip_address}</td>
                        <td>${formatDateTime(log.timestamp)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('logs-table').innerHTML = html;
}

// Load errors data
async function loadErrors() {
    const filter = document.getElementById('errorFilter').value;
    
    try {
        const response = await fetch(`ajax/get_errors.php?filter=${encodeURIComponent(filter)}`);
        const data = await response.json();
        
        if (data.success) {
            renderErrorsTable(data.errors);
        } else {
            showAlert('Error loading errors: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error loading errors: ' + error.message, 'danger');
    }
}

function renderErrorsTable(errors) {
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Context</th>
                    <th>Error Message</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${errors.map(error => `
                    <tr>
                        <td>${error.id}</td>
                        <td>${error.username || 'Unknown'}</td>
                        <td>${error.context}</td>
                        <td title="${error.error_message}">${error.error_message.substring(0, 50)}...</td>
                        <td><span class="badge badge-${getErrorStatusColor(error.status)}">${error.status}</span></td>
                        <td>${formatDateTime(error.timestamp)}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="viewError(${error.id})">View</button>
                            <select class="form-control form-control-sm" style="width: auto; display: inline-block;" onchange="updateErrorStatus(${error.id}, this.value)">
                                <option value="new" ${error.status === 'new' ? 'selected' : ''}>New</option>
                                <option value="investigating" ${error.status === 'investigating' ? 'selected' : ''}>Investigating</option>
                                <option value="resolved" ${error.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                                <option value="ignored" ${error.status === 'ignored' ? 'selected' : ''}>Ignored</option>
                            </select>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('errors-table').innerHTML = html;
}

// Form submissions
document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const isEdit = !!formData.get('id');
    
    try {
        const response = await fetch('ajax/save_user.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(isEdit ? 'User updated successfully' : 'User created successfully', 'success');
            closeModal('userModal');
            loadUsers();
        } else {
            showAlert('Error saving user: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error saving user: ' + error.message, 'danger');
    }
});

document.getElementById('siteForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const isEdit = !!formData.get('id');
    
    try {
        const response = await fetch('ajax/save_site.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(isEdit ? 'Site updated successfully' : 'Site created successfully', 'success');
            closeModal('siteModal');
            loadSites();
        } else {
            showAlert('Error saving site: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error saving site: ' + error.message, 'danger');
    }
});

document.getElementById('keyForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    try {
        const response = await fetch('ajax/create_key.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Access key created successfully', 'success');
            closeModal('keyModal');
            loadKeys();
        } else {
            showAlert('Error creating key: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error creating key: ' + error.message, 'danger');
    }
});

// Delete functions
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('ajax/delete_user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('User deleted successfully', 'success');
            loadUsers();
        } else {
            showAlert('Error deleting user: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error deleting user: ' + error.message, 'danger');
    }
}

async function deleteSite(siteId) {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('ajax/delete_site.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: siteId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Site deleted successfully', 'success');
            loadSites();
        } else {
            showAlert('Error deleting site: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error deleting site: ' + error.message, 'danger');
    }
}

async function deleteKey(keyId) {
    if (!confirm('Are you sure you want to delete this access key? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('ajax/delete_key.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: keyId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Access key deleted successfully', 'success');
            loadKeys();
        } else {
            showAlert('Error deleting key: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error deleting key: ' + error.message, 'danger');
    }
}

async function revokeKey(keyId) {
    if (!confirm('Are you sure you want to revoke this access key?')) {
        return;
    }
    
    try {
        const response = await fetch('ajax/revoke_key.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: keyId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Access key revoked successfully', 'success');
            loadKeys();
        } else {
            showAlert('Error revoking key: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error revoking key: ' + error.message, 'danger');
    }
}

async function updateErrorStatus(errorId, status) {
    try {
        const response = await fetch('ajax/update_error_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: errorId, status: status })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Error status updated successfully', 'success');
        } else {
            showAlert('Error updating status: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error updating status: ' + error.message, 'danger');
    }
}

async function viewError(errorId) {
    try {
        const response = await fetch(`ajax/get_error_details.php?id=${errorId}`);
        const data = await response.json();
        
        if (data.success) {
            const error = data.error;
            const content = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Error Details - ID: ${error.id}</h5>
                        <button class="close" onclick="closeModal('errorDetailsModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label><strong>User:</strong></label>
                            <p>${error.username || 'Unknown'}</p>
                        </div>
                        <div class="form-group">
                            <label><strong>Context:</strong></label>
                            <p>${error.context}</p>
                        </div>
                        <div class="form-group">
                            <label><strong>Error Message:</strong></label>
                            <p>${error.error_message}</p>
                        </div>
                        <div class="form-group">
                            <label><strong>Stack Trace:</strong></label>
                            <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; max-height: 200px; overflow-y: auto;">${error.stack_trace || 'No stack trace available'}</pre>
                        </div>
                        <div class="form-group">
                            <label><strong>Extension Version:</strong></label>
                            <p>${error.extension_version || 'Unknown'}</p>
                        </div>
                        <div class="form-group">
                            <label><strong>URL:</strong></label>
                            <p>${error.url || 'Unknown'}</p>
                        </div>
                        <div class="form-group">
                            <label><strong>IP Address:</strong></label>
                            <p>${error.ip_address}</p>
                        </div>
                        <div class="form-group">
                            <label><strong>User Agent:</strong></label>
                            <p style="word-break: break-all;">${error.user_agent || 'Unknown'}</p>
                        </div>
                        <div class="form-group">
                            <label><strong>Timestamp:</strong></label>
                            <p>${formatDateTime(error.timestamp)}</p>
                        </div>
                    </div>
                    <div class="text-center mt-2">
                        <button class="btn btn-secondary" onclick="closeModal('errorDetailsModal')">Close</button>
                    </div>
                </div>
            `;
            
            // Create or update error details modal
            let modal = document.getElementById('errorDetailsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'errorDetailsModal';
                modal.className = 'modal';
                document.body.appendChild(modal);
            }
            
            modal.innerHTML = content;
            modal.classList.add('show');
        } else {
            showAlert('Error loading error details: ' + data.message, 'danger');
        }
    } catch (error) {
        showAlert('Error loading error details: ' + error.message, 'danger');
    }
}

// Utility functions
function getStatusColor(status) {
    switch (status) {
        case 'active': return 'success';
        case 'inactive': return 'warning';
        case 'suspended': return 'danger';
        case 'revoked': return 'danger';
        default: return 'secondary';
    }
}

function getErrorStatusColor(status) {
    switch (status) {
        case 'new': return 'danger';
        case 'investigating': return 'warning';
        case 'resolved': return 'success';
        case 'ignored': return 'secondary';
        default: return 'secondary';
    }
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function showAlert(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close any open modals
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }
});