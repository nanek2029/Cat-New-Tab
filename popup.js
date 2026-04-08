async function getFavorites() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["favoriteCats"], (result) => {
      resolve(result.favoriteCats || []);
    });
  });
}

async function removeFavorite(imageId) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["favoriteCats"], (result) => {
      const favorites = (result.favoriteCats || []).filter((fav) => fav.id !== imageId);
      chrome.storage.local.set({ favoriteCats: favorites }, () => resolve());
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

  const trash = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  trash.setAttribute("viewBox", "0 0 90 90");
  trash.setAttribute("aria-label", "Remove favorite");
  trash.setAttribute("role", "img");
  trash.classList.add("favorite-trash");
  trash.innerHTML = '<path d="M 72.002 10.915 H 17.998 c -3.134 0 -5.675 2.541 -5.675 5.675 v 7.049 h 65.354 V 16.59 C 77.677 13.456 75.136 10.915 72.002 10.915 z" transform="matrix(1 0 0 1 0 0)"/><path d="M 57.546 15.544 H 32.454 c -1.42 0 -2.571 -1.151 -2.571 -2.571 V 6.19 c 0 -3.413 2.777 -6.19 6.19 -6.19 h 17.854 c 3.413 0 6.191 2.777 6.191 6.19 v 6.782 C 60.117 14.392 58.966 15.544 57.546 15.544 z M 35.026 10.401 h 19.949 V 6.19 c 0 -0.578 -0.47 -1.047 -1.048 -1.047 H 36.073 c -0.578 0 -1.047 0.47 -1.047 1.047 V 10.401 z" transform="matrix(1 0 0 1 0 0)"/><path d="M 74.016 28.782 H 15.984 v 55.543 c 0 3.134 2.541 5.675 5.675 5.675 h 46.682 c 3.134 0 5.675 -2.541 5.675 -5.675 V 28.782 z" transform="matrix(1 0 0 1 0 0)"/><path d="M 31.915 79.328 c 0 1.42 -1.151 2.571 -2.571 2.571 c -1.42 0 -2.571 -1.151 -2.571 -2.571 V 41.509 c 0 -1.42 1.151 -2.571 2.571 -2.571 c 1.42 0 2.571 1.151 2.571 2.571 V 79.328 z" transform="matrix(1 0 0 1 0 0)" class="trash-can-detail"/><path d="M 47.571 79.328 c 0 1.42 -1.151 2.571 -2.571 2.571 s -2.571 -1.151 -2.571 -2.571 V 41.509 c 0 -1.42 1.151 -2.571 2.571 -2.571 s 2.571 1.151 2.571 2.571 V 79.328 z" transform="matrix(1 0 0 1 0 0)" class="trash-can-detail"/><path d="M 63.228 79.328 c 0 1.42 -1.151 2.571 -2.571 2.571 c -1.42 0 -2.571 -1.151 -2.571 -2.571 V 41.509 c 0 -1.42 1.151 -2.571 2.571 -2.571 c 1.42 0 2.571 1.151 2.571 2.571 V 79.328 z" transform="matrix(1 0 0 1 0 0)" class="trash-can-detail"/>';

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
  card.appendChild(trash);

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
  let [favorites, selected] = await Promise.all([
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
    const trash = event.target.closest(".favorite-trash");
    if (trash) {
      const card = event.target.closest(".card");
      if (!card) return;

      const imageId = Number(card.dataset.imageId);
      await removeFavorite(imageId);
      favorites = favorites.filter((item) => item.id !== imageId);
      card.remove();

      if (!favorites.length) {
        empty.classList.remove("hidden");
      }
      return;
    }

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
