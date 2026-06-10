function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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

async function fetchPreviewDirect(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const html = await resp.text();
    return (
      extractMeta(html, "og:image:secure_url") ||
      extractMeta(html, "og:image") ||
      extractMeta(html, "twitter:image:src") ||
      extractMeta(html, "twitter:image")
    );
  } catch {
    return null;
  }
}

async function loadData() {
  const result = await chrome.storage.session.get("pendingSave");
  const data = result.pendingSave || { url: "", name: "" };

  document.getElementById("url").value = data.url;
  document.getElementById("name").value = data.name;

  const type = detectType(data.url);
  let previewUrl = null;

  if (type === "image") {
    previewUrl = data.url;
  } else if (type === "video") {
    previewUrl = getVideoPreview(data.url);
  }

  if (previewUrl) {
    showPreview(previewUrl);
  }

  if (type === "website" && data.url) {
    const resp = await chrome.runtime.sendMessage({
      action: "fetchPreview",
      url: data.url
    }).catch(() => null);

    if (resp?.preview) {
      showPreview(resp.preview);
    } else {
      const direct = await fetchPreviewDirect(data.url);
      if (direct) showPreview(direct);
    }

    if (resp?.ogTitle && !data.name) {
      document.getElementById("name").value = resp.ogTitle;
    }
  }
}

function showPreview(url) {
  const area = document.getElementById("previewArea");
  const img = document.getElementById("previewImage");
  img.onerror = () => { img.style.display = "none"; };
  img.src = url;
  area.style.display = "block";
}

document.getElementById("cancelBtn").addEventListener("click", () => window.close());
document.getElementById("cancelFormBtn").addEventListener("click", () => window.close());

document.getElementById("saveForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const url = document.getElementById("url").value.trim();
  const description = document.getElementById("description").value.trim();

  if (!name || !url) return;

  const type = detectType(url);
  let previewUrl = null;

  if (type === "image") {
    previewUrl = url;
  } else if (type === "video") {
    previewUrl = getVideoPreview(url);
  }

  const link = {
    id: generateId(),
    name,
    url,
    description,
    type,
    preview: previewUrl,
    createdAt: Date.now()
  };

  if (type === "website") {
    const resp = await chrome.runtime.sendMessage({
      action: "fetchPreview",
      url
    }).catch(() => null);

    if (resp?.preview) {
      link.preview = resp.preview;
    } else {
      const direct = await fetchPreviewDirect(url);
      if (direct) link.preview = direct;
    }
  }

  const result = await chrome.storage.local.get("links");
  const links = result.links || [];
  links.unshift(link);
  await chrome.storage.local.set({ links });

  window.close();
});

loadData();
