// popup.js - Main popup functionality

class DatingAutomationApp {
    constructor() {
        this.API_BASE = 'http://www.portslip.com/api';
        this.ACCESS_KEY = 'your-embedded-access-key-here'; // Replace with actual key
        this.currentUser = null;
        this.currentSiteConfig = null;
        this.isProcessing = false;
        this.soundEnabled = true;
        this.soundCache = {};
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadSettings();
        await this.checkExistingLogin();
    }

    setupEventListeners() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        
        // Tabs
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Bulk Like
        document.getElementById('startLikingBtn').addEventListener('click', () => this.startBulkLike());
        
        // Bulk Messages
        document.getElementById('savedMessageSelect').addEventListener('change', (e) => this.loadSelectedMessage(e));
        document.getElementById('saveMessageBtn').addEventListener('click', () => this.openMessageModal());
        document.getElementById('sendToAllBtn').addEventListener('click', () => this.startBulkMessage());
        
        // Saved Messages
        document.getElementById('addNewMessageBtn').addEventListener('click', () => this.openMessageModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeMessageModal());
        document.getElementById('cancelMessageBtn').addEventListener('click', () => this.closeMessageModal());
        document.getElementById('saveMessageModalBtn').addEventListener('click', () => this.saveMessage());
        
        // Account Settings
        document.getElementById('soundToggle').addEventListener('click', () => this.toggleSound());
        document.getElementById('soundEnabledSetting').addEventListener('change', (e) => this.setSoundEnabled(e.target.checked));
        document.getElementById('forgetLikedBtn').addEventListener('click', () => this.forgetLikedProfiles());
        document.getElementById('forgetMessagedBtn').addEventListener('click', () => this.forgetMessagedProfiles());
        document.getElementById('changePasswordBtn').addEventListener('click', () => this.changePassword());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Modal backdrop click
        document.getElementById('messageModal').addEventListener('click', (e) => {
            if (e.target.id === 'messageModal') this.closeMessageModal();
        });
    }

    async loadSettings() {
        const settings = await this.getStorageData(['soundEnabled', 'likedProfiles', 'messagedProfiles']);
        this.soundEnabled = settings.soundEnabled !== false;
        this.updateSoundUI();
    }

    async checkExistingLogin() {
        const userData = await this.getStorageData(['currentUser', 'authToken']);
        if (userData.currentUser && userData.authToken) {
            this.currentUser = userData.currentUser;
            await this.showMainScreen();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showError('loginError', 'Please enter both username and password');
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.API_BASE}/login.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                    access_key: this.ACCESS_KEY
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                await this.setStorageData({
                    currentUser: data.user,
                    authToken: data.token
                });
                
                await this.showMainScreen();
                this.hideError('loginError');
            } else {
                this.showError('loginError', data.message || 'Login failed');
            }
        } catch (error) {
            this.showError('loginError', 'Connection error. Please try again.');
            this.logError('Login error', error);
        } finally {
            this.showLoading(false);
        }
    }

    async showMainScreen() {
        // Check if this is first login
        const hasLoggedInBefore = await this.getStorageData(['hasLoggedInBefore']);
        if (!hasLoggedInBefore.hasLoggedInBefore) {
            await this.setStorageData({ hasLoggedInBefore: true });
            this.switchTab('dating-sites');
        }

        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainScreen').classList.remove('hidden');
        
        await this.loadDatingSites();
        await this.loadSavedMessages();
        await this.loadAccountInfo();
        await this.getCurrentSiteConfig();
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
        
        // Load tab-specific data
        if (tabName === 'bulk-like' || tabName === 'bulk-messages') {
            this.getCurrentSiteConfig();
        }
    }

    async getCurrentSiteConfig() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            const response = await fetch(`${this.API_BASE}/get_config.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_key: this.ACCESS_KEY,
                    active_url: tab.url
                })
            });

            const data = await response.json();
            if (data.success) {
                this.currentSiteConfig = data.config;
                await this.preloadSounds();
            }
        } catch (error) {
            this.logError('Config loading error', error);
        }
    }

    async preloadSounds() {
        if (!this.currentSiteConfig || !this.currentSiteConfig.sounds) return;
        
        for (const [type, url] of Object.entries(this.currentSiteConfig.sounds)) {
            try {
                if (!this.soundCache[url]) {
                    const audio = new Audio(url);
                    audio.preload = 'auto';
                    this.soundCache[url] = audio;
                }
            } catch (error) {
                console.warn(`Failed to preload sound ${type}:`, error);
            }
        }
    }

    playSound(type) {
        if (!this.soundEnabled || !this.currentSiteConfig?.sounds?.[type]) return;
        
        try {
            const url = this.currentSiteConfig.sounds[type];
            const audio = this.soundCache[url] || new Audio(url);
            audio.currentTime = 0;
            audio.play().catch(e => console.warn('Sound play failed:', e));
        } catch (error) {
            console.warn(`Failed to play ${type} sound:`, error);
        }
    }

    async loadDatingSites() {
        try {
            const response = await fetch(`${this.API_BASE}/get_config.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_key: this.ACCESS_KEY,
                    request_type: 'dating_sites'
                })
            });

            const data = await response.json();
            if (data.success) {
                this.renderDatingSites(data.sites);
            }
        } catch (error) {
            this.logError('Sites loading error', error);
        }
    }

    renderDatingSites(sites) {
        const container = document.getElementById('sitesList');
        container.innerHTML = sites.map(site => `
            <div class="site-item" data-url="${site.url}">
                <img src="${site.logo}" alt="${site.name}" class="site-logo" onerror="this.style.display='none'">
                <div class="site-name">${site.name}</div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.site-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                chrome.tabs.create({ url });
            });
        });
    }

    async startBulkLike() {
        if (this.isProcessing) return;
        
        if (!this.currentSiteConfig) {
            alert('Please navigate to a supported dating site first.');
            return;
        }

        this.isProcessing = true;
        this.showLikeProgress(true);
        document.getElementById('startLikingBtn').disabled = true;

        try {
            await this.executeBulkLike();
        } catch (error) {
            this.logError('Bulk like error', error);
            alert('An error occurred during the liking process.');
        } finally {
            this.isProcessing = false;
            document.getElementById('startLikingBtn').disabled = false;
            this.showLikeProgress(false);
        }
    }

    async executeBulkLike() {
        const likedProfiles = await this.getLikedProfiles();
        let totalLiked = 0;
        let stats = { standard: 0, gold: 0, platinum: 0, skipped: 0 };

        // Get profile data
        const profileData = await this.collectProfileData();
        if (!profileData.success) {
            throw new Error(profileData.error);
        }

        const allProfiles = profileData.data.profiles;
        const totalProfiles = allProfiles.length;

        for (let i = 0; i < allProfiles.length; i++) {
            const profile = allProfiles[i];
            
            // Check if already liked
            if (likedProfiles.includes(profile.memberId)) {
                stats.skipped++;
                this.playSound('duplicate');
                this.updateLikeProgress(totalLiked, stats, i + 1, totalProfiles);
                continue;
            }

            try {
                const result = await this.performLike(profile.memberId);
                if (result.success) {
                    totalLiked++;
                    await this.addLikedProfile(profile.memberId);
                    
                    // Update stats based on profile type
                    const profileType = profile.type || 'standard';
                    stats[profileType] = (stats[profileType] || 0) + 1;
                    
                    this.playSound('success');
                } else {
                    stats.skipped++;
                    this.playSound('failure');
                }
            } catch (error) {
                stats.skipped++;
                this.playSound('failure');
                this.logError('Individual like error', error);
            }

            this.updateLikeProgress(totalLiked, stats, i + 1, totalProfiles);
            
            // Small delay to avoid overwhelming the server
            await this.delay(100);
        }

        // Update backend usage
        await this.updateUsage('likes', totalLiked);
    }

    async startBulkMessage() {
        if (this.isProcessing) return;
        
        const messageText = document.getElementById('messageText').value.trim();
        if (!messageText) {
            alert('Please enter a message to send.');
            return;
        }

        if (!this.currentSiteConfig) {
            alert('Please navigate to a supported dating site first.');
            return;
        }

        this.isProcessing = true;
        this.showMessageProgress(true);
        document.getElementById('sendToAllBtn').disabled = true;

        try {
            await this.executeBulkMessage(messageText);
        } catch (error) {
            this.logError('Bulk message error', error);
            alert('An error occurred during the messaging process.');
        } finally {
            this.isProcessing = false;
            document.getElementById('sendToAllBtn').disabled = false;
            this.showMessageProgress(false);
        }
    }

    async executeBulkMessage(messageText) {
        const messagedProfiles = await this.getMessagedProfiles();
        let totalSent = 0;
        let stats = { standard: 0, gold: 0, platinum: 0, skipped: 0 };

        // Get profile data
        const profileData = await this.collectProfileData();
        if (!profileData.success) {
            throw new Error(profileData.error);
        }

        const allProfiles = profileData.data.profiles;
        const totalProfiles = allProfiles.length;

        for (let i = 0; i < allProfiles.length; i++) {
            const profile = allProfiles[i];
            
            // Check if already messaged
            if (messagedProfiles.includes(profile.memberId)) {
                stats.skipped++;
                this.playSound('duplicate');
                this.updateMessageProgress(totalSent, stats, i + 1, totalProfiles);
                continue;
            }

            try {
                const result = await this.performMessage(profile.memberId, messageText);
                if (result.success) {
                    totalSent++;
                    await this.addMessagedProfile(profile.memberId);
                    
                    // Update stats based on profile type
                    const profileType = profile.type || 'standard';
                    stats[profileType] = (stats[profileType] || 0) + 1;
                    
                    this.playSound('success');
                } else {
                    stats.skipped++;
                    this.playSound('failure');
                }
            } catch (error) {
                stats.skipped++;
                this.playSound('failure');
                this.logError('Individual message error', error);
            }

            this.updateMessageProgress(totalSent, stats, i + 1, totalProfiles);
            
            // Small delay to avoid overwhelming the server
            await this.delay(200);
        }

        // Update backend usage
        await this.updateUsage('messages', totalSent);
    }

    async collectProfileData() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'initiateDataCollection',
                config: this.currentSiteConfig
            }, resolve);
        });
    }

    async performLike(memberId) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'executeContentScript',
                actionType: 'like',
                data: { memberId, config: this.currentSiteConfig }
            }, resolve);
        });
    }

    async performMessage(memberId, messageText) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'executeContentScript',
                actionType: 'message',
                data: { memberId, message: messageText, config: this.currentSiteConfig }
            }, resolve);
        });
    }

    // Saved Messages Management
    async loadSavedMessages() {
        const data = await this.getStorageData(['savedMessages']);
        const savedMessages = data.savedMessages || [];
        
        this.renderSavedMessages(savedMessages);
        this.updateSavedMessagesDropdown(savedMessages);
    }

    renderSavedMessages(messages) {
        const container = document.getElementById('savedMessagesList');
        container.innerHTML = messages.map(msg => `
            <div class="message-item" data-id="${msg.id}">
                <div class="message-content">
                    <div class="message-name">${msg.name}</div>
                    <div class="message-text">${msg.text}</div>
                </div>
                <div class="message-actions">
                    <button class="btn btn-secondary edit-message">Edit</button>
                    <button class="btn btn-danger delete-message">Delete</button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.edit-message').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const messageId = e.target.closest('.message-item').dataset.id;
                this.editMessage(messageId);
            });
        });

        container.querySelectorAll('.delete-message').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const messageId = e.target.closest('.message-item').dataset.id;
                this.deleteMessage(messageId);
            });
        });
    }

    updateSavedMessagesDropdown(messages) {
        const select = document.getElementById('savedMessageSelect');
        select.innerHTML = '<option value="">Select a saved message...</option>' +
            messages.map(msg => `<option value="${msg.id}">${msg.name}</option>`).join('');
    }

    openMessageModal(messageId = null) {
        this.currentEditingMessageId = messageId;
        const modal = document.getElementById('messageModal');
        const title = document.getElementById('modalTitle');
        const nameInput = document.getElementById('messageName');
        const textInput = document.getElementById('modalMessageText');

        if (messageId) {
            // Edit mode
            title.textContent = 'Edit Message';
            this.getStorageData(['savedMessages']).then(data => {
                const message = (data.savedMessages || []).find(msg => msg.id === messageId);
                if (message) {
                    nameInput.value = message.name;
                    textInput.value = message.text;
                }
            });
        } else {
            // Add mode
            title.textContent = 'Add New Message';
            nameInput.value = '';
            textInput.value = '';
        }

        modal.classList.remove('hidden');
        nameInput.focus();
    }

    closeMessageModal() {
        document.getElementById('messageModal').classList.add('hidden');
        this.currentEditingMessageId = null;
    }

    async saveMessage() {
        const name = document.getElementById('messageName').value.trim();
        const text = document.getElementById('modalMessageText').value.trim();

        if (!name || !text) {
            alert('Please enter both name and message text.');
            return;
        }

        const data = await this.getStorageData(['savedMessages']);
        let savedMessages = data.savedMessages || [];

        if (this.currentEditingMessageId) {
            // Edit existing message
            const index = savedMessages.findIndex(msg => msg.id === this.currentEditingMessageId);
            if (index !== -1) {
                savedMessages[index] = { ...savedMessages[index], name, text };
            }
        } else {
            // Add new message
            const newMessage = {
                id: Date.now().toString(),
                name,
                text,
                createdAt: new Date().toISOString()
            };
            savedMessages.push(newMessage);
        }

        await this.setStorageData({ savedMessages });
        await this.loadSavedMessages();
        this.closeMessageModal();
    }

    async editMessage(messageId) {
        this.openMessageModal(messageId);
    }

    async deleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }

        const data = await this.getStorageData(['savedMessages']);
        const savedMessages = (data.savedMessages || []).filter(msg => msg.id !== messageId);
        
        await this.setStorageData({ savedMessages });
        await this.loadSavedMessages();
    }

    loadSelectedMessage(e) {
        const messageId = e.target.value;
        if (!messageId) {
            document.getElementById('messageText').value = '';
            return;
        }

        this.getStorageData(['savedMessages']).then(data => {
            const message = (data.savedMessages || []).find(msg => msg.id === messageId);
            if (message) {
                document.getElementById('messageText').value = message.text;
            }
        });
    }

    // Profile tracking
    async getLikedProfiles() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const siteKey = this.getSiteKey(tab?.url);
        const data = await this.getStorageData(['likedProfiles']);
        return data.likedProfiles?.[siteKey] || [];
    }

    async addLikedProfile(memberId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const siteKey = this.getSiteKey(tab?.url);
        const data = await this.getStorageData(['likedProfiles']);
        const likedProfiles = data.likedProfiles || {};
        
        if (!likedProfiles[siteKey]) {
            likedProfiles[siteKey] = [];
        }
        
        if (!likedProfiles[siteKey].includes(memberId)) {
            likedProfiles[siteKey].push(memberId);
            await this.setStorageData({ likedProfiles });
        }
    }

    async getMessagedProfiles() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const siteKey = this.getSiteKey(tab?.url);
        const data = await this.getStorageData(['messagedProfiles']);
        return data.messagedProfiles?.[siteKey] || [];
    }

    async addMessagedProfile(memberId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const siteKey = this.getSiteKey(tab?.url);
        const data = await this.getStorageData(['messagedProfiles']);
        const messagedProfiles = data.messagedProfiles || {};
        
        if (!messagedProfiles[siteKey]) {
            messagedProfiles[siteKey] = [];
        }
        
        if (!messagedProfiles[siteKey].includes(memberId)) {
            messagedProfiles[siteKey].push(memberId);
            await this.setStorageData({ messagedProfiles });
        }
    }

    getSiteKey(url) {
        if (!url) return 'unknown';
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    async forgetLikedProfiles() {
        if (!confirm('Are you sure you want to forget all liked profiles? This action cannot be undone.')) {
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const siteKey = this.getSiteKey(tab?.url);
        const data = await this.getStorageData(['likedProfiles']);
        const likedProfiles = data.likedProfiles || {};
        
        delete likedProfiles[siteKey];
        await this.setStorageData({ likedProfiles });
        
        alert('Liked profiles have been forgotten for this site.');
    }

    async forgetMessagedProfiles() {
        if (!confirm('Are you sure you want to forget all messaged profiles? This action cannot be undone.')) {
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const siteKey = this.getSiteKey(tab?.url);
        const data = await this.getStorageData(['messagedProfiles']);
        const messagedProfiles = data.messagedProfiles || {};
        
        delete messagedProfiles[siteKey];
        await this.setStorageData({ messagedProfiles });
        
        alert('Messaged profiles have been forgotten for this site.');
    }

    // Account management
    async loadAccountInfo() {
        if (!this.currentUser) return;

        // Update UI with user data
        document.getElementById('totalProfilesLiked').textContent = this.currentUser.total_likes || 0;
        document.getElementById('totalMessagesSent').textContent = this.currentUser.total_messages || 0;
        document.getElementById('accountActivated').textContent = this.currentUser.created_at || '-';
        document.getElementById('accountExpiry').textContent = this.currentUser.expires_at || '-';
        document.getElementById('creditsLeft').textContent = this.currentUser.credits_left || '-';
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.setStorageData({ soundEnabled: this.soundEnabled });
        this.updateSoundUI();
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        this.setStorageData({ soundEnabled: enabled });
        this.updateSoundUI();
    }

    updateSoundUI() {
        const toggle = document.getElementById('soundToggle');
        const checkbox = document.getElementById('soundEnabledSetting');
        
        toggle.textContent = this.soundEnabled ? '🔊' : '🔇';
        toggle.title = this.soundEnabled ? 'Disable Sound' : 'Enable Sound';
        checkbox.checked = this.soundEnabled;
    }

    changePassword() {
        const newPassword = prompt('Enter new password:');
        if (!newPassword) return;

        const confirmPassword = prompt('Confirm new password:');
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        // Implement password change API call
        fetch(`${this.API_BASE}/change_password.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_key: this.ACCESS_KEY,
                username: this.currentUser.username,
                new_password: newPassword
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Password changed successfully.');
            } else {
                alert('Failed to change password: ' + data.message);
            }
        })
        .catch(error => {
            alert('Error changing password.');
            this.logError('Password change error', error);
        });
    }

    async logout() {
        if (!confirm('Are you sure you want to logout?')) {
            return;
        }

        await this.setStorageData({ currentUser: null, authToken: null });
        this.currentUser = null;
        
        document.getElementById('mainScreen').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        
        // Reset form
        document.getElementById('loginForm').reset();
    }

    // Progress tracking
    showLikeProgress(show) {
        const progressSection = document.getElementById('likeProgress');
        progressSection.classList.toggle('hidden', !show);
        
        if (!show) {
            // Reset progress
            this.updateLikeProgress(0, { standard: 0, gold: 0, platinum: 0, skipped: 0 }, 0, 0);
        }
    }

    updateLikeProgress(totalLiked, stats, currentItem, totalItems) {
        document.getElementById('totalLiked').textContent = totalLiked;
        document.getElementById('standardLiked').textContent = stats.standard;
        document.getElementById('goldLiked').textContent = stats.gold;
        document.getElementById('platinumLiked').textContent = stats.platinum;
        document.getElementById('skippedLikes').textContent = stats.skipped;
        document.getElementById('currentLikePage').textContent = `${currentItem}/${totalItems}`;
        
        const percentage = totalItems > 0 ? (currentItem / totalItems) * 100 : 0;
        document.getElementById('likeProgressBar').style.width = `${percentage}%`;
    }

    showMessageProgress(show) {
        const progressSection = document.getElementById('messageProgress');
        progressSection.classList.toggle('hidden', !show);
        
        if (!show) {
            // Reset progress
            this.updateMessageProgress(0, { standard: 0, gold: 0, platinum: 0, skipped: 0 }, 0, 0);
        }
    }

    updateMessageProgress(totalSent, stats, currentItem, totalItems) {
        document.getElementById('totalSent').textContent = totalSent;
        document.getElementById('standardSent').textContent = stats.standard;
        document.getElementById('goldSent').textContent = stats.gold;
        document.getElementById('platinumSent').textContent = stats.platinum;
        document.getElementById('skippedMessages').textContent = stats.skipped;
        document.getElementById('currentMessagePage').textContent = `${currentItem}/${totalItems}`;
        
        const percentage = totalItems > 0 ? (currentItem / totalItems) * 100 : 0;
        document.getElementById('messageProgressBar').style.width = `${percentage}%`;
    }

    // Backend communication
    async updateUsage(type, count) {
        try {
            await fetch(`${this.API_BASE}/update_usage.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_key: this.ACCESS_KEY,
                    username: this.currentUser?.username,
                    type: type,
                    count: count
                })
            });
        } catch (error) {
            this.logError('Usage update error', error);
        }
    }

    async logError(context, error) {
        try {
            const errorData = {
                access_key: this.ACCESS_KEY,
                user: this.currentUser?.username || 'anonymous',
                context: context,
                error_message: error.message || error.toString(),
                stack_trace: error.stack || '',
                extension_version: chrome.runtime.getManifest().version,
                timestamp: new Date().toISOString(),
                url: window.location.href
            };

            await fetch(`${this.API_BASE}/log_error.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorData)
            });
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }
        
        console.error(`${context}:`, error);
    }

    // Utility functions
    showLoading(show) {
        document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    hideError(elementId) {
        const errorElement = document.getElementById(elementId);
        errorElement.classList.remove('show');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStorageData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    }

    setStorageData(data) {
        return new Promise((resolve) => {
            chrome.storage.local.set(data, resolve);
        });
    }
}

// Initialize the application when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new DatingAutomationApp();
});