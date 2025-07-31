// content.js - Content script for interacting with dating sites

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'collectProfiles') {
    collectProfilesFromCurrentPage(message.config)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (message.action === 'navigateToPage') {
    navigateToPage(message.pageNumber)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (message.action === 'performLike') {
    performLike(message.memberId, message.config)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (message.action === 'performMessage') {
    performMessage(message.memberId, message.messageText, message.config)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function collectProfilesFromCurrentPage(config) {
  try {
    // Wait for page to load
    await waitForPageLoad();
    
    // Extract user info
    const userMeta = document.querySelector('meta[name="user-info"]');
    const userInfo = userMeta ? JSON.parse(userMeta.content) : null;
    
    // Get pagination info
    const totalPages = getTotalPages(config);
    const currentPage = getCurrentPageNumber();
    
    // Collect profiles
    const profileElements = document.querySelectorAll(config.profileSelector || '[data-chatmemberid]');
    const profiles = [];
    
    for (const element of profileElements) {
      const memberId = element.getAttribute('data-chatmemberid');
      if (memberId) {
        // Get additional profile info if needed
        const profileData = await getProfileDetails(memberId, config);
        profiles.push({
          memberId: memberId,
          ...profileData
        });
      }
    }
    
    return {
      userInfo,
      totalPages,
      currentPage,
      profiles
    };
  } catch (error) {
    throw new Error(`Failed to collect profiles: ${error.message}`);
  }
}

async function navigateToPage(pageNumber) {
  try {
    // Find pagination link
    const pageLink = document.querySelector(`a[href*="page=${pageNumber}"], a[data-page="${pageNumber}"]`);
    
    if (pageLink) {
      pageLink.click();
      await waitForPageLoad();
    } else {
      // Try constructing URL
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('page', pageNumber);
      window.location.href = currentUrl.toString();
      await waitForPageLoad();
    }
  } catch (error) {
    throw new Error(`Failed to navigate to page ${pageNumber}: ${error.message}`);
  }
}

async function performLike(memberId, config) {
  try {
    const url = config.likeEndpoint.replace('{memberId}', memberId);
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data: data,
      memberId: memberId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      memberId: memberId
    };
  }
}

async function performMessage(memberId, messageText, config) {
  try {
    const url = config.messageEndpoint;
    
    // Prepare form data based on site configuration
    const formData = new FormData();
    formData.append(config.memberIdField || 'memberId', memberId);
    formData.append(config.messageField || 'message', messageText);
    
    // Add any additional required fields from config
    if (config.additionalFields) {
      for (const [key, value] of Object.entries(config.additionalFields)) {
        formData.append(key, value);
      }
    }
    
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data: data,
      memberId: memberId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      memberId: memberId
    };
  }
}

async function getProfileDetails(memberId, config) {
  try {
    if (!config.profileDetailsEndpoint) {
      return {};
    }
    
    const url = config.profileDetailsEndpoint.replace('{memberId}', memberId);
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    
    return {};
  } catch (error) {
    console.warn(`Failed to get profile details for ${memberId}:`, error);
    return {};
  }
}

function getTotalPages(config) {
  try {
    const paginationElements = document.querySelectorAll(config.paginationSelector || '.pagination a, .pager a');
    let maxPage = 1;
    
    paginationElements.forEach(element => {
      const pageText = element.textContent.trim();
      const pageNumber = parseInt(pageText);
      if (!isNaN(pageNumber) && pageNumber > maxPage) {
        maxPage = pageNumber;
      }
    });
    
    // Also check for "last" or "next" buttons that might indicate more pages
    const lastPageElement = document.querySelector('[data-page], .pagination [href*="page="]');
    if (lastPageElement) {
      const href = lastPageElement.getAttribute('href') || lastPageElement.getAttribute('data-page');
      const match = href.match(/page=(\d+)/);
      if (match) {
        const pageNumber = parseInt(match[1]);
        if (pageNumber > maxPage) {
          maxPage = pageNumber;
        }
      }
    }
    
    return maxPage;
  } catch (error) {
    console.warn('Failed to determine total pages:', error);
    return 1;
  }
}

function getCurrentPageNumber() {
  try {
    // Try to find current page indicator
    const currentElement = document.querySelector('.pagination .current, .pagination .active, .pager .current');
    if (currentElement) {
      const pageNumber = parseInt(currentElement.textContent);
      if (!isNaN(pageNumber)) {
        return pageNumber;
      }
    }
    
    // Try to extract from URL
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam) {
      const pageNumber = parseInt(pageParam);
      if (!isNaN(pageNumber)) {
        return pageNumber;
      }
    }
    
    return 1;
  } catch (error) {
    console.warn('Failed to determine current page:', error);
    return 1;
  }
}

function waitForPageLoad() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
      return;
    }
    
    const checkReady = () => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    
    checkReady();
  });
}

// Initialize content script
console.log('Dating site automation content script loaded');