async function getFavorites() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["favoriteCats"], (result) => {
      resolve(result.favoriteCats || []);
    });
  });
}

async function getActiveTabId() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      resolve(tabs?.[0]?.id ?? null);
    });
  });
}

const storageArea = (chrome.storage && chrome.storage.session) ? chrome.storage.session : chrome.storage.local;

async function getSelectedWallpaper(tabId) {
  return new Promise((resolve) => {
    storageArea.get(["selectedByTab"], (result) => {
      const map = result.selectedByTab || {};
      resolve(tabId && map[tabId] ? map[tabId] : null);
    });
  });
}

async function setSelectedWallpaper(tabId, image) {
  return new Promise((resolve) => {
    storageArea.get(["selectedByTab"], (result) => {
      const map = result.selectedByTab || {};
      if (tabId) {
        map[tabId] = image;
      }
      storageArea.set({ selectedByTab: map }, () => resolve());
    });
  });
}

function showStatus(message) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.classList.remove("hidden");
  setTimeout(() => status.classList.add("hidden"), 1800);
}

function createCard(image, isSelected) {
  const card = document.createElement("div");
  card.className = `card${isSelected ? " selected" : ""}`;
  card.dataset.imageId = String(image.id);

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  const thumbUrl = image.preview || image.medium || image.large || "";
  if (thumbUrl) {
    thumb.style.backgroundImage = `url('${thumbUrl}')`;
  }

  const meta = document.createElement("div");
  meta.className = "meta";

  const title = document.createElement("div");
  title.className = "meta-title";
  title.textContent = image.user ? `Photo by ${image.user}` : "Favorite wallpaper";

  const actions = document.createElement("div");
  actions.className = "actions";

  const button = document.createElement("button");
  button.className = "btn";
  button.textContent = "Set as wallpaper";

  const tag = document.createElement("div");
  tag.className = "tag";
  tag.textContent = "Current";
  if (!isSelected) {
    tag.style.display = "none";
  }

  actions.appendChild(button);
  actions.appendChild(tag);

  meta.appendChild(title);
  meta.appendChild(actions);

  card.appendChild(thumb);
  card.appendChild(meta);

  return card;
}

function highlightSelected(imageId) {
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    const isMatch = card.dataset.imageId === String(imageId);
    card.classList.toggle("selected", isMatch);
    const tag = card.querySelector(".tag");
    if (tag) {
      tag.style.display = isMatch ? "block" : "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("favorites-list");
  const empty = document.getElementById("empty-state");

  const tabId = await getActiveTabId();
  const [favorites, selected] = await Promise.all([
    getFavorites(),
    getSelectedWallpaper(tabId)
  ]);

  if (!favorites.length) {
    empty.classList.remove("hidden");
    return;
  }

  const selectedId = selected?.id ?? null;

  favorites.forEach((image) => {
    const isSelected = selectedId !== null && image.id === selectedId;
    const card = createCard(image, isSelected);
    list.appendChild(card);
  });

  list.addEventListener("click", async (event) => {
    const button = event.target.closest(".btn");
    if (!button) return;
    const card = event.target.closest(".card");
    if (!card) return;

    const imageId = Number(card.dataset.imageId);
    const image = favorites.find((item) => item.id === imageId);
    if (!image) return;

    await setSelectedWallpaper(tabId, image);
    highlightSelected(image.id);
  });
});
