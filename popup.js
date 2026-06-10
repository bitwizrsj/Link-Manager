let links = [];
let currentFilter = "all";
let currentSort = "newest";
let searchQuery = "";

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function typeIcon(type) {
  if (type === "image") return "IMG";
  if (type === "video") return "VID";
  return "WEB";
}

function getFilteredAndSorted() {
  let filtered = [...links];

  if (currentFilter !== "all") {
    filtered = filtered.filter((l) => l.type === currentFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q))
    );
  }

  if (currentSort === "newest") {
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  } else if (currentSort === "oldest") {
    filtered.sort((a, b) => a.createdAt - b.createdAt);
  } else if (currentSort === "az") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (currentSort === "za") {
    filtered.sort((a, b) => b.name.localeCompare(a.name));
  }

  return filtered;
}

function render() {
  const grid = document.getElementById("linksGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("linkCount");

  const displayed = getFilteredAndSorted();

  count.textContent = links.length;

  // Remove existing cards but keep empty state
  const cards = grid.querySelectorAll(".link-card");
  cards.forEach((c) => c.remove());

  if (displayed.length === 0) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  displayed.forEach((link) => {
    const card = document.createElement("div");
    card.className = "link-card";
    card.dataset.id = link.id;

    const initials = link.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const previewUrl =
      link.preview ||
      `https://www.google.com/s2/favicons?domain=${getDomain(link.url)}&sz=128`;

    card.innerHTML = `
      <div class="card-preview">
        <img src="${previewUrl}" alt="" loading="lazy">
        <span class="card-initials">${initials}</span>
        <span class="card-type-badge ${link.type}">${typeIcon(link.type)} ${link.type}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title" title="${link.name.replace(/"/g, "&quot;")}">${link.name}</h3>
        ${link.description ? `<p class="card-desc" title="${link.description.replace(/"/g, "&quot;")}">${link.description}</p>` : ""}
        <div class="card-meta">
          <span class="card-domain">${getDomain(link.url)}</span>
          <span class="card-time">${timeAgo(link.createdAt)}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="card-btn open-btn" title="Open link">↗</button>
        <button class="card-btn copy-btn" title="Copy URL">⎘</button>
        <button class="card-btn delete-btn" title="Delete">✕</button>
      </div>
    `;

    const img = card.querySelector(".card-preview img");
    img.addEventListener("error", () => {
      img.style.display = "none";
      card.querySelector(".card-initials").style.display = "flex";
      card.querySelector(".card-preview").classList.add("card-preview-fallback");
    });

    card.querySelector(".open-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: link.url });
    });

    card.querySelector(".copy-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(link.url);
        showToast("URL copied!");
      } catch {
        showToast("Failed to copy");
      }
    });

    card.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${link.name}"?`)) {
        links = links.filter((l) => l.id !== link.id);
        await chrome.storage.local.set({ links });
        render();
        showToast("Link deleted");
      }
    });

    card.addEventListener("click", () => {
      chrome.tabs.create({ url: link.url });
    });

    grid.appendChild(card);
  });
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// Event listeners
document.getElementById("addLinkBtn").addEventListener("click", () => {
  chrome.storage.session.set({ pendingSave: { url: "", name: "" } }, () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("save.html"),
      type: "popup",
      width: 480,
      height: 580
    });
  });
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  render();
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

document.getElementById("sortSelect").addEventListener("change", (e) => {
  currentSort = e.target.value;
  render();
});

// Initial load
async function init() {
  const result = await chrome.storage.local.get("links");
  links = result.links || [];
  render();
}

init();

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.links) {
    links = changes.links.newValue || [];
    render();
  }
});
