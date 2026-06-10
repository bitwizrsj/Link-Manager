chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveLink",
    title: "Save this Link to LinkSaver",
    contexts: ["link"]
  });
  chrome.contextMenus.create({
    id: "savePage",
    title: "Save this Page to LinkSaver",
    contexts: ["page"]
  });
  chrome.contextMenus.create({
    id: "saveImage",
    title: "Save this Image to LinkSaver",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let data = {};

  if (info.menuItemId === "saveLink") {
    data.url = info.linkUrl;
    data.name = info.selectionText || info.linkText || "";
  } else if (info.menuItemId === "savePage") {
    data.url = info.pageUrl;
    data.name = tab?.title || "";
  } else if (info.menuItemId === "saveImage") {
    data.url = info.srcUrl;
    data.name = info.selectionText || "";
  }

  chrome.storage.session.set({ pendingSave: data }, () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("save.html"),
      type: "popup",
      width: 480,
      height: 580
    });
  });
});

function extractMeta(html, name) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`,
      "i"
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchPreview(url) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { signal: controller.signal });
    const html = await resp.text();

    const preview =
      extractMeta(html, "og:image:secure_url") ||
      extractMeta(html, "og:image") ||
      extractMeta(html, "twitter:image:src") ||
      extractMeta(html, "twitter:image");

    const ogTitle = extractMeta(html, "og:title");
    const ogDesc = extractMeta(html, "og:description");
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);

    return {
      preview,
      ogTitle: ogTitle || (titleMatch ? titleMatch[1] : null),
      ogDesc,
    };
  } catch {
    return { preview: null, ogTitle: null, ogDesc: null };
  }
}

function detectType(url) {
  if (/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)(\?.*)?$/i.test(url)) {
    return "image";
  }
  if (/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv)/i.test(url)) {
    return "video";
  }
  return "website";
}

function getVideoPreview(url) {
  const yt = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://vumbnail.com/${vimeo[1]}.jpg`;

  return null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "fetchPreview") {
    const type = detectType(msg.url);
    let preview = null;

    if (type === "image") {
      preview = msg.url;
    } else if (type === "video") {
      preview = getVideoPreview(msg.url);
    }

    if (preview) {
      sendResponse({ type, preview });
    } else {
      fetchPreview(msg.url).then((result) => {
        sendResponse({
          type: "website",
          preview: result.preview,
          ogTitle: result.ogTitle,
          ogDesc: result.ogDesc
        });
      });
    }

    return true;
  }
});
