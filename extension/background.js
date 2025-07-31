// background.js - Service Worker for Chrome Extension

const DATING_SITES = [
  'https://www.internationalcupid.com/',
  'https://www.afrointroductions.com/'
];

// Update icon based on active tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  updateIcon(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateIcon(tabId);
  }
});

async function updateIcon(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const isActiveSite = DATING_SITES.some(site => tab.url && tab.url.startsWith(site));
    
    const iconPath = isActiveSite ? {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    } : {
      "16": "icons/icon16_inactive.png",
      "32": "icons/icon32_inactive.png",
      "48": "icons/icon48_inactive.png",
      "128": "icons/icon128_inactive.png"
    };
    
    await chrome.action.setIcon({ path: iconPath, tabId: tabId });
  } catch (error) {
    console.error('Error updating icon:', error);
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'initiateDataCollection') {
    handleDataCollection(message, sendResponse);
    return true; // Keep the message channel open for async response
  } else if (message.action === 'executeContentScript') {
    executeContentScript(message, sendResponse);
    return true;
  }
});

async function handleDataCollection(message, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    // Check if it's a supported dating site
    const isSupported = DATING_SITES.some(site => tab.url.startsWith(site));
    if (!isSupported) {
      sendResponse({ success: false, error: 'Current tab is not a supported dating site' });
      return;
    }

    // Inject and execute content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectProfileData,
      args: [message.config]
    });

    if (results && results[0]) {
      sendResponse({ success: true, data: results[0].result });
    } else {
      sendResponse({ success: false, error: 'Failed to collect data' });
    }
  } catch (error) {
    console.error('Error in data collection:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function executeContentScript(message, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: executeAction,
      args: [message.actionType, message.data]
    });

    sendResponse({ success: true, result: results[0].result });
  } catch (error) {
    console.error('Error executing content script:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Function to be injected into the page
function collectProfileData(config) {
  return new Promise((resolve) => {
    try {
      // Extract user info from meta tag
      const userMeta = document.querySelector('meta[name="user-info"]');
      const userInfo = userMeta ? JSON.parse(userMeta.content) : null;
      
      if (!userInfo) {
        resolve({ success: false, error: 'User info not found' });
        return;
      }

      // Get total pages
      const paginationElements = document.querySelectorAll(config.paginationSelector || '.pagination a');
      let totalPages = 1;
      
      if (paginationElements.length > 0) {
        const pageNumbers = Array.from(paginationElements)
          .map(el => parseInt(el.textContent))
          .filter(num => !isNaN(num));
        totalPages = Math.max(...pageNumbers, 1);
      }

      // Collect profile data from current page
      const profileElements = document.querySelectorAll(config.profileSelector || '[data-chatmemberid]');
      const profiles = [];

      profileElements.forEach(element => {
        const memberId = element.getAttribute('data-chatmemberid');
        if (memberId) {
          profiles.push({
            memberId: memberId,
            element: element.outerHTML
          });
        }
      });

      resolve({
        success: true,
        data: {
          userInfo: userInfo,
          totalPages: totalPages,
          currentPageProfiles: profiles,
          currentPage: getCurrentPageNumber()
        }
      });

    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

function executeAction(actionType, data) {
  if (actionType === 'like') {
    return executeLike(data.memberId, data.config);
  } else if (actionType === 'message') {
    return executeMessage(data.memberId, data.message, data.config);
  }
}

function executeLike(memberId, config) {
  return new Promise((resolve) => {
    try {
      const url = config.likeEndpoint.replace('{memberId}', memberId);
      
      fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => response.json())
      .then(data => {
        resolve({ success: true, data: data });
      })
      .catch(error => {
        resolve({ success: false, error: error.message });
      });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

function executeMessage(memberId, message, config) {
  return new Promise((resolve) => {
    try {
      const url = config.messageEndpoint;
      const formData = new FormData();
      formData.append('memberId', memberId);
      formData.append('message', message);
      
      fetch(url, {
        method: 'POST',
        credentials: 'include',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => response.json())
      .then(data => {
        resolve({ success: true, data: data });
      })
      .catch(error => {
        resolve({ success: false, error: error.message });
      });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

function getCurrentPageNumber() {
  const currentPageElement = document.querySelector('.pagination .current, .pagination .active');
  return currentPageElement ? parseInt(currentPageElement.textContent) : 1;
}