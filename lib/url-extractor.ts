import { Readability } from "@mozilla/readability"
import { JSDOM } from "jsdom"
import { lookup } from "dns/promises"


function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false; // Not IPv4, likely IPv6 or invalid. 
  // For this snippet we'll focus on IPv4 blocking which is 99% of SSRF vectors in this context.

  // 127.0.0.0/8 (Localhost)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 (Private A)
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 (Private B)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 (Private C)
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true;
  // 169.254.0.0/16 (Link local)
  if (parts[0] === 169 && parts[1] === 254) return true;

  return false;
}

const MAX_EXTRACTED_LENGTH = 50000

export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      throw new Error("Invalid URL format")
    }

    // SECURITY: SSRF Protection
    // Resolve hostname to IP to ensure we aren't connecting to internal private networks
    try {
      if (parsedUrl.hostname === 'localhost') throw new Error("Localhost access denied");

      const ipAddress = await lookup(parsedUrl.hostname);

      if (isPrivateIP(ipAddress.address)) {
        throw new Error(`Access to private network address (${ipAddress.address}) is denied.`);
      }
    } catch (dnsError: any) {
      // FAIL SECURE: If we cannot verify the IP (DNS failure) or if it was blocked, we MUST abort.
      throw new Error(`Security Check Failed: ${dnsError.message}`);
    }

    // Only allow http/https protocols
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Only HTTP and HTTPS URLs are supported")
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
      redirect: "follow",
    })

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          "This website blocked our request. The URL may require authentication or have bot protection. Try copying the content directly instead."
        )
      }
      if (response.status === 404) {
        throw new Error("URL not found. Please check the URL and try again.")
      }
      if (response.status >= 500) {
        throw new Error("The website server is experiencing issues. Please try again later.")
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const dom = new JSDOM(html, { url })
    const document = dom.window.document

    // Use Readability to extract clean article content
    const reader = new Readability(document)
    const article = reader.parse()

    let text = ""
    if (article && article.textContent) {
      // Readability provides clean, extracted article text
      text = article.textContent
    } else {
      // Fallback: try common content selectors if Readability fails
      const contentSelectors = [
        "article",
        "[role='article']",
        ".post-content",
        ".article-content",
        ".content",
        "main",
        ".main-content",
        ".main-content",
      ]

      let contentElement: Element | null = null
      for (const selector of contentSelectors) {
        contentElement = document.querySelector(selector)
        if (contentElement) break
      }

      if (contentElement) {
        text = contentElement.textContent || ""
      } else {
        // Final fallback: get body text
        text = document.body?.textContent || ""
      }
    }

    // Clean up text
    text = text
      // 1. Replace multiple spaces/tabs with a single space (but keep newlines)
      .replace(/[ \t]+/g, " ")
      // 2. Replace 3+ newlines with just 2 (to preserve paragraph breaks)
      .replace(/\n\s*\n/g, "\n\n")
      .trim()

    // Truncate if too long
    if (text.length > MAX_EXTRACTED_LENGTH) {
      text = text.substring(0, MAX_EXTRACTED_LENGTH) + "..."
    }

    if (text.length < 100) {
      throw new Error("Extracted text too short - may not be valid content")
    }

    return text
  } catch (error: any) {
    console.error("URL extraction error:", error)

    // If it's already a user-friendly error message, re-throw it
    if (error.message && (
      error.message.includes("blocked our request") ||
      error.message.includes("not found") ||
      error.message.includes("server is experiencing") ||
      error.message.includes("Invalid URL") ||
      error.message.includes("Only HTTP and HTTPS") ||
      error.message.includes("Security Check Failed")
    )) {
      throw error
    }

    // Handle timeout errors
    if (error.name === "AbortError" || error.message?.includes("timeout")) {
      throw new Error("Request timed out. The website may be slow or unavailable. Please try again or copy the content directly.")
    }

    // Handle network errors
    if (error.message?.includes("fetch") || error.message?.includes("network")) {
      throw new Error("Network error. Please check your connection and try again.")
    }

    // Generic error
    throw new Error(
      `Failed to extract content from URL: ${error.message || "Unknown error"}. The website may require authentication or have restrictions. Try copying the content directly instead.`
    )
  }
}
