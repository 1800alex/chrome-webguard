// Content script for Website Whitelist Guard
(function () {
  "use strict";

  const IMG_PLACEHOLDER = false; // Set to false to disable image placeholders
  let isChecking = false;
  let lastHost = "";
  let iframeObserver = null;
  let mediaObserver = null;
  let settings = {
    blockImages: false,
    blockVideos: false,
    whitelist: [],
    redirectUrl: "https://www.google.com",
  };

  // Load extension settings
  function loadSettings() {
    chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
      if (response) {
        settings = response;
        // Re-scan existing media after settings change
        scanExistingMedia();
      }
    });
  }

  function checkCurrentSite() {
    if (isChecking) return;

    const currentHost = window.location.hostname;

    // Skip if we've already checked this host recently
    if (currentHost === lastHost) return;
    lastHost = currentHost;

    // Skip chrome:// and extension pages
    if (
      window.location.protocol === "chrome:" ||
      window.location.protocol === "chrome-extension:"
    ) {
      return;
    }

    isChecking = true;

    chrome.runtime.sendMessage(
      {
        action: "checkWhitelist",
        host: currentHost,
      },
      (response) => {
        isChecking = false;

        if (chrome.runtime.lastError) {
          console.log(
            "[Website Whitelist Guard] Extension communication error:",
            chrome.runtime.lastError
          );
          return;
        }

        if (response && !response.allowed) {
          // Redirect to configured destination
          window.location.href = response.redirectUrl;
        }
      }
    );
  }

  function checkIframeHost(iframe) {
    if (iframe.contentDocument) {
      if (settings.blockImages) {
        // Also check for images within added elements
        const images = iframe.contentDocument.querySelectorAll("img");
        if (images) {
          images.forEach(checkMediaElement);
        }
      }

      if (settings.blockVideos) {
        // Also check for videos within added elements
        const videos = iframe.contentDocument.querySelectorAll("video");
        if (videos) {
          videos.forEach(checkMediaElement);
        }
      }
    }

    try {
      const src = iframe.src;
      if (
        !src ||
        src.startsWith("about:") ||
        src.startsWith("javascript:") ||
        src.startsWith("data:")
      ) {
        return;
      }

      const url = new URL(src);
      const iframeHost = url.hostname;

      chrome.runtime.sendMessage(
        {
          action: "checkWhitelist",
          host: iframeHost,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log(
              "[Website Whitelist Guard] Extension iframe check error:",
              chrome.runtime.lastError
            );
            return;
          }

          if (response && !response.allowed) {
            // Block the iframe by replacing its src
            iframe.src = response.redirectUrl;
            console.log(
              `[Website Whitelist Guard] Blocked iframe from ${iframeHost}, redirected to ${response.redirectUrl}`
            );
          }
        }
      );
    } catch (error) {
      // Invalid URL or other error, ignore
    }
  }

  function isWhitelisted(host) {
    for (const domain of settings.whitelist) {
      if (host === domain || host.endsWith("." + domain)) {
        return true;
      }
    }
    return false;
  }

  function urlFromSrc(src) {
    try {
      if (src.startsWith("blob:")) {
        if (
          !src.startsWith("blob:http://") &&
          !src.startsWith("blob:https://")
        ) {
          return null;
        }
        return new URL(src.slice(5));
      }
      return new URL(src);
    } catch (error) {
      return null;
    }
  }

  function checkMediaElement(element) {
    try {
      let src = "";
      const tagName = element.tagName.toLowerCase();
      if (tagName === "img") {
        src = element.src;
        if (!settings.blockImages) return;
      } else if (tagName === "video") {
        src = element.src || element.currentSrc;
        if (!settings.blockVideos) return;
      }

      if (!src || src.startsWith("data:") || src.startsWith("about:")) {
        return;
      }

      const url = urlFromSrc(src);
      if (!url) return;

      const mediaHost = url.hostname;

      if (!isWhitelisted(mediaHost)) {
        if (
          element.style.display === "none" &&
          element.style.visibility === "hidden"
        ) {
          return; // Already blocked
        }

        // Hide the element
        element.style.display = "none";
        element.style.visibility = "hidden";

        if (IMG_PLACEHOLDER === true) {
          // Add a placeholder div
          const placeholder = document.createElement("div");
          placeholder.style.cssText = `
          display: inline-block;
          background: #f0f0f0;
          border: 2px dashed #ccc;
          padding: 10px;
          margin: 2px;
          text-align: center;
          font-family: Arial, sans-serif;
          font-size: 12px;
          color: #666;
          min-width: 100px;
          min-height: 50px;
          z-index: -9999;
        `;
          placeholder.textContent = `🚫 Blocked ${tagName} from ${mediaHost}`;

          // Insert placeholder after the original element
          element.parentNode.insertBefore(placeholder, element.nextSibling);
        }

        console.log(
          `[Website Whitelist Guard] Blocked ${tagName} from ${mediaHost}`
        );
      }
    } catch (error) {
      // Invalid URL or other error, ignore
    }
  }

  function scanExistingIframes() {
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach(checkIframeHost);
  }

  function scanExistingMedia() {
    if (settings.blockImages) {
      const images = document.querySelectorAll("img");
      images.forEach(checkMediaElement);
    }

    if (settings.blockVideos) {
      const videos = document.querySelectorAll("video");
      videos.forEach(checkMediaElement);
    }
  }

  function setupIframeMonitoring() {
    // Clean up existing observer
    if (iframeObserver) {
      iframeObserver.disconnect();
    }

    // Create new observer for iframe changes
    iframeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check for new iframes
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === "IFRAME") {
                checkIframeHost(node);
              } else {
                // Check for iframes within added elements
                const iframes =
                  node.querySelectorAll && node.querySelectorAll("iframe");
                if (iframes) {
                  iframes.forEach(checkIframeHost);

                  if (settings.blockImages) {
                    // Also check for images within added elements
                    const images =
                      node.querySelectorAll && node.querySelectorAll("img");
                    if (images) {
                      images.forEach(checkMediaElement);
                    }
                  }

                  if (settings.blockVideos) {
                    // Also check for videos within added elements
                    const videos =
                      node.querySelectorAll && node.querySelectorAll("video");
                    if (videos) {
                      videos.forEach(checkMediaElement);
                    }
                  }
                }
              }
            }
          });
        }

        // Check for iframe src attribute changes
        if (
          mutation.type === "attributes" &&
          mutation.target.tagName === "IFRAME" &&
          mutation.attributeName === "src"
        ) {
          checkIframeHost(mutation.target);
        }
      });
    });

    // Start observing
    iframeObserver.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    // Initial scan of existing iframes
    if (document.readyState !== "loading") {
      scanExistingIframes();
    } else {
      document.addEventListener("DOMContentLoaded", scanExistingIframes);
    }
  }

  function setupMediaMonitoring() {
    // Clean up existing observer
    if (mediaObserver) {
      mediaObserver.disconnect();
    }

    // Create new observer for media changes
    mediaObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check direct media elements
              if (
                (node.tagName === "IMG" && settings.blockImages) ||
                (node.tagName === "VIDEO" && settings.blockVideos)
              ) {
                checkMediaElement(node);
              } else {
                // Check for media within added elements
                if (settings.blockImages) {
                  const images =
                    node.querySelectorAll && node.querySelectorAll("img");
                  if (images) {
                    images.forEach(checkMediaElement);
                  }
                }
                if (settings.blockVideos) {
                  const videos =
                    node.querySelectorAll && node.querySelectorAll("video");
                  if (videos) {
                    videos.forEach(checkMediaElement);
                  }
                }
              }
            }
          });
        }

        // Check for src attribute changes on media elements
        if (
          mutation.type === "attributes" &&
          ((mutation.target.tagName === "IMG" && settings.blockImages) ||
            (mutation.target.tagName === "VIDEO" && settings.blockVideos)) &&
          (mutation.attributeName === "src" ||
            mutation.attributeName === "currentSrc")
        ) {
          checkMediaElement(mutation.target);
        }
      });
    });

    // Start observing
    mediaObserver.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "currentSrc"],
    });

    // Initial scan of existing media
    if (document.readyState !== "loading") {
      scanExistingMedia();
    } else {
      document.addEventListener("DOMContentLoaded", scanExistingMedia);
    }
  }

  // Load settings first
  loadSettings();

  console.log(
    `[Website Whitelist Guard] Initial settings loaded: ${JSON.stringify(
      settings
    )}`
  );

  // Check immediately when script loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      checkCurrentSite();
      setupIframeMonitoring();
      setupMediaMonitoring();
    });
  } else {
    checkCurrentSite();
    setupIframeMonitoring();
    setupMediaMonitoring();
  }

  // Monitor for navigation changes (for SPAs)
  let currentUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      setTimeout(() => {
        checkCurrentSite();
        scanExistingIframes(); // Re-scan iframes after navigation
        scanExistingMedia(); // Re-scan media after navigation
      }, 100); // Small delay to let navigation complete
    }
  });

  observer.observe(document, { subtree: true, childList: true });

  // Also listen for popstate events
  window.addEventListener("popstate", () => {
    setTimeout(() => {
      checkCurrentSite();
      scanExistingIframes();
      scanExistingMedia();
    }, 100);
  });

  // Periodic check as backup (every 2 seconds)
  setInterval(() => {
    checkCurrentSite();
    scanExistingIframes();
    scanExistingMedia();
  }, 2000);

  // Listen for settings changes
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "settingsChanged") {
      loadSettings();
    }
  });
})();
