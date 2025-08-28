// Content script for Website Whitelist Guard
(function () {
  "use strict";

  let isChecking = false;
  let lastHost = "";
  let iframeObserver = null;

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
            "Extension communication error:",
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
              "Extension iframe check error:",
              chrome.runtime.lastError
            );
            return;
          }

          if (response && !response.allowed) {
            // Block the iframe by replacing its src
            iframe.src = response.redirectUrl;
            console.log(
              `Blocked iframe from ${iframeHost}, redirected to ${response.redirectUrl}`
            );
          }
        }
      );
    } catch (error) {
      // Invalid URL or other error, ignore
    }
  }

  function scanExistingIframes() {
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach(checkIframeHost);
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

  // Check immediately when script loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      checkCurrentSite();
      setupIframeMonitoring();
    });
  } else {
    checkCurrentSite();
    setupIframeMonitoring();
  }

  // Monitor for navigation changes (for SPAs)
  let currentUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      setTimeout(() => {
        checkCurrentSite();
        scanExistingIframes(); // Re-scan iframes after navigation
      }, 100); // Small delay to let navigation complete
    }
  });

  observer.observe(document, { subtree: true, childList: true });

  // Also listen for popstate events
  window.addEventListener("popstate", () => {
    setTimeout(() => {
      checkCurrentSite();
      scanExistingIframes();
    }, 100);
  });

  // Periodic check as backup (every 2 seconds)
  setInterval(() => {
    checkCurrentSite();
    scanExistingIframes();
  }, 2000);
})();
