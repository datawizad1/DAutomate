-- Dating Site Automation Tool Database Schema
-- MySQL/MariaDB compatible

CREATE DATABASE IF NOT EXISTS dating_automation;
USE dating_automation;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at DATETIME,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    total_likes INT DEFAULT 0,
    total_messages INT DEFAULT 0,
    credits_left INT DEFAULT 1000,
    max_daily_likes INT DEFAULT 100,
    max_daily_messages INT DEFAULT 50
);

-- Access keys table
CREATE TABLE access_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_value VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
    max_users INT DEFAULT -1, -- -1 means unlimited
    current_users INT DEFAULT 0,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Admin users table
CREATE TABLE admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

-- Dating sites configuration table
CREATE TABLE site_configurations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    base_url VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255),
    profile_selector VARCHAR(255) DEFAULT '[data-chatmemberid]',
    pagination_selector VARCHAR(255) DEFAULT '.pagination a',
    like_endpoint VARCHAR(255),
    message_endpoint VARCHAR(255),
    profile_details_endpoint VARCHAR(255),
    member_id_field VARCHAR(50) DEFAULT 'memberId',
    message_field VARCHAR(50) DEFAULT 'message',
    additional_fields JSON,
    sound_success_url VARCHAR(255),
    sound_duplicate_url VARCHAR(255),
    sound_failure_url VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Usage logs table
CREATE TABLE usage_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    username VARCHAR(50),
    action_type ENUM('login', 'like', 'message', 'config_request', 'error') NOT NULL,
    site_url VARCHAR(255),
    details JSON,
    count INT DEFAULT 1,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_action_timestamp (action_type, timestamp)
);

-- Error logs table
CREATE TABLE error_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    username VARCHAR(50),
    context VARCHAR(255),
    error_message TEXT,
    stack_trace TEXT,
    extension_version VARCHAR(20),
    url VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('new', 'investigating', 'resolved', 'ignored') DEFAULT 'new',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_timestamp (timestamp),
    INDEX idx_status (status)
);

-- User sessions table (for login token management)
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
);

-- Insert default access key
INSERT INTO access_keys (key_value, name, status) VALUES 
('your-embedded-access-key-here', 'Default Extension Key', 'active');

-- Insert default admin user (password: admin123 - CHANGE THIS!)
INSERT INTO admin_users (username, password_hash, email, role) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@example.com', 'super_admin');

-- Insert default site configurations
INSERT INTO site_configurations (
    name, base_url, logo_url, 
    like_endpoint, message_endpoint, profile_details_endpoint,
    sound_success_url, sound_duplicate_url, sound_failure_url
) VALUES 
(
    'InternationalCupid', 
    'https://www.internationalcupid.com/', 
    'https://www.internationalcupid.com/favicon.ico',
    'https://www.internationalcupid.com/ajax/like/{memberId}',
    'https://www.internationalcupid.com/ajax/send_message',
    'https://www.internationalcupid.com/ajax/profile/{memberId}',
    'http://www.portslip.com/sounds/success.mp3',
    'http://www.portslip.com/sounds/duplicate.mp3',
    'http://www.portslip.com/sounds/failure.mp3'
),
(
    'AfroIntroductions', 
    'https://www.afrointroductions.com/', 
    'https://www.afrointroductions.com/favicon.ico',
    'https://www.afrointroductions.com/ajax/like/{memberId}',
    'https://www.afrointroductions.com/ajax/send_message',
    'https://www.afrointroductions.com/ajax/profile/{memberId}',
    'http://www.portslip.com/sounds/success.mp3',
    'http://www.portslip.com/sounds/duplicate.mp3',
    'http://www.portslip.com/sounds/failure.mp3'
);