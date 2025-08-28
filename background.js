// Background service worker for Website Whitelist Guard
chrome.runtime.onInstalled.addListener(() => {
  // Set default configuration on install
  chrome.storage.sync.get(
    ["password", "whitelist", "redirectUrl"],
    (result) => {
      if (!result.password) {
        chrome.storage.sync.set({
          password: "", // No password set initially
          whitelist: ["google.com", "github.com"], // Default whitelist
          redirectUrl: "https://www.google.com", // Default redirect
          isEnabled: true,
          blockImages: false, // Default: don't block images
          blockVideos: false, // Default: don't block videos
        });
      }
    }
  );
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkWhitelist") {
    chrome.storage.sync.get(
      ["whitelist", "redirectUrl", "isEnabled"],
      (result) => {
        const whitelist = result.whitelist || [];
        const redirectUrl = result.redirectUrl || "https://www.google.com";
        const isEnabled = result.isEnabled !== false;

        if (!isEnabled) {
          sendResponse({ allowed: true });
          return;
        }

        const currentHost = request.host;
        let isAllowed = false;

        // Check if current host matches any whitelisted domain
        for (const domain of whitelist) {
          if (currentHost === domain || currentHost.endsWith("." + domain)) {
            isAllowed = true;
            break;
          }
        }

        sendResponse({
          allowed: isAllowed,
          redirectUrl: redirectUrl,
        });
      }
    );
    return true; // Keep message channel open for async response
  } else if (request.action === "getSettings") {
    chrome.storage.sync.get(
      ["whitelist", "redirectUrl", "isEnabled", "blockImages", "blockVideos"],
      (result) => {
        sendResponse({
          whitelist: result.whitelist || [],
          redirectUrl: result.redirectUrl || "https://www.google.com",
          isEnabled: result.isEnabled !== false,
          blockImages: result.blockImages === true,
          blockVideos: result.blockVideos === true,
        });
      }
    );
    return true;
  }
});

// Notify content scripts when settings change
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (
    namespace === "sync" &&
    (changes.blockImages || changes.blockVideos || changes.whitelist)
  ) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, { action: "settingsChanged" })
          .catch(() => {
            // Ignore errors for tabs that can't receive messages
          });
      });
    });
  }
});

// Monitor tab updates for additional protection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) {
    try {
      const url = new URL(tab.url);
      const host = url.hostname;

      // Skip chrome:// and extension pages
      if (url.protocol === "chrome:" || url.protocol === "chrome-extension:") {
        return;
      }

      chrome.storage.sync.get(
        ["whitelist", "redirectUrl", "isEnabled"],
        (result) => {
          const whitelist = result.whitelist || [];
          const redirectUrl = result.redirectUrl || "https://www.google.com";
          const isEnabled = result.isEnabled !== false;

          if (!isEnabled) return;

          let isAllowed = false;
          for (const domain of whitelist) {
            if (host === domain || host.endsWith("." + domain)) {
              isAllowed = true;
              break;
            }
          }

          if (!isAllowed) {
            chrome.tabs.update(tabId, { url: redirectUrl });
          }
        }
      );
    } catch (error) {
      console.log("Error processing URL:", error);
    }
  }
});
