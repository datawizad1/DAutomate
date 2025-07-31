# Dating Site Automation Tool - Setup Instructions

## Prerequisites 

- Chrome browser (for extension development)
- Web server (Apache/Nginx) with PHP 7.4+
- MySQL 5.7+ or MariaDB 10.3+
- Basic knowledge of Chrome extension development

## Extension Setup

### 1. Prepare Extension Files

Create a folder structure like this:
```
dating-automation-extension/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── popup.css
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    ├── icon128.png
    ├── icon16_inactive.png
    ├── icon32_inactive.png
    ├── icon48_inactive.png
    └── icon128_inactive.png
```

### 2. Create Icon Files

You'll need to create 8 icon files:
- Active icons (colorful): icon16.png, icon32.png, icon48.png, icon128.png
- Inactive icons (grayscale): icon16_inactive.png, icon32_inactive.png, icon48_inactive.png, icon128_inactive.png

### 3. Update Configuration

In `popup.js`, update the following:
- `API_BASE`: Change to your backend URL
- `ACCESS_KEY`: Replace with your actual access key

### 4. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select your extension folder
5. The extension should now appear in your extensions list

## Backend Setup

### 1. Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE dating_automation;
```

2. Import the schema:
```bash
mysql -u your_username -p dating_automation < schema.sql
```

### 2. Configure Database Connection

Edit `includes/config.php` and update:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'dating_automation');
define('DB_USER', 'your_db_username');
define('DB_PASS', 'your_db_password');
```

### 3. Update Security Settings

1. Change the JWT secret:
```php
define('JWT_SECRET', 'your-secure-jwt-secret-key');
```

2. Update the default admin password:
```sql
UPDATE admin_users SET password_hash = '$2y$10$your_new_password_hash' WHERE username = 'admin';
```

3. Generate a secure access key:
```sql
UPDATE access_keys SET key_value = 'your-secure-access-key' WHERE id = 1;
```

### 4. File Structure

Create this directory structure on your web server:
```
/var/www/html/dating-automation/
├── includes/
│   └── config.php
├── api/
│   ├── login.php
│   ├── get_config.php
│   ├── update_usage.php
│   ├── log_error.php
│   └── validate_key.php
├── admin/
│   ├── index.php
│   ├── login.php
│   ├── logout.php
│   ├── admin.js
│   └── ajax/
│       ├── get_users.php
│       ├── save_user.php
│       ├── delete_user.php
│       ├── get_sites.php
│       ├── save_site.php
│       ├── delete_site.php
│       ├── get_keys.php
│       ├── create_key.php
│       ├── delete_key.php
│       ├── revoke_key.php
│       ├── get_logs.php
│       ├── get_errors.php
│       ├── update_error_status.php
│       └── get_error_details.php
└── uploads/ (create this directory with write permissions)
```

### 5. Set Permissions

```bash
# Make uploads directory writable
chmod 755 /var/www/html/dating-automation/uploads/

# Ensure proper ownership
chown -R www-data:www-data /var/www/html/dating-automation/
```

## Initial Configuration

### 1. Access Admin Panel

1. Navigate to `http://your-domain.com/dating-automation/admin/`
2. Login with:
   - Username: `admin`
   - Password: `admin123` (CHANGE THIS IMMEDIATELY!)

### 2. Create First User Account

1. Go to "Users" tab
2. Click "Add User"
3. Fill in user details
4. Set appropriate credits and expiry date

### 3. Configure Dating Sites

The system comes with pre-configured InternationalCupid and AfroIntroductions settings. You can:
1. Edit existing configurations
2. Add new dating sites
3. Update API endpoints and selectors as needed

### 4. Sound Files

Place sound files in a publicly accessible directory and update the URLs in site configurations:
- Success sound (e.g., success.mp3)
- Duplicate action sound (e.g., duplicate.mp3)
- Failure sound (e.g., failure.mp3)

## Security Considerations

### 1. Change Default Credentials

- Update admin username/password
- Generate new access keys
- Change JWT secret key

### 2. SSL/HTTPS

Enable HTTPS for your backend to ensure secure communication.

### 3. Firewall Rules

Consider restricting access to admin panel by IP address.

### 4. Database Security

- Use strong database passwords
- Limit database user permissions
- Regular backups

## Testing

### 1. Extension Testing

1. Load extension in Chrome
2. Navigate to a supported dating site
3. Check that the extension icon becomes active
4. Test login functionality
5. Verify all tabs work properly

### 2. Backend Testing

1. Test all API endpoints
2. Verify admin panel functionality
3. Check error logging
4. Test user management features

## Troubleshooting

### Common Issues

1. **Extension not loading**: Check console for JavaScript errors
2. **API errors**: Verify CORS settings and endpoint URLs
3. **Database connection issues**: Check credentials and server status
4. **Sound not playing**: Verify sound file URLs and browser permissions

### Debug Mode

Enable debug mode in `includes/config.php`:
```php
define('DEBUG_MODE', true);
```

### Logs

Check the following for errors:
- Browser console (F12)
- PHP error logs
- Database logs
- Extension background page console

## Production Deployment

### 1. Disable Debug Mode

```php
define('DEBUG_MODE', false);
```

### 2. Environment Variables

Consider using environment variables for sensitive configuration.

### 3. Monitoring

Set up monitoring for:
- API response times
- Error rates
- Database performance
- Extension usage statistics

## Support

For technical support or questions:
1. Check error logs first
2. Review this documentation
3. Test in a development environment
4. Contact your development team

## Security Updates

- Regularly update PHP and database software
- Monitor for security vulnerabilities
- Update extension permissions as needed
- Review and rotate access keys periodically