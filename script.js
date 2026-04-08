document.addEventListener('click', (event) => {
  const x = event.clientX; // Relative to viewport
  const y = event.clientY; // Relative to viewport
  // Or for document-relative: const pageX = event.pageX;
  // Display in console:
  console.log(`X: ${x}, Y: ${y}`);
});

document.addEventListener('DOMContentLoaded', function () {

  // ========= DOM ELEMENTS =========
  const backgroundContainer = document.getElementById('background-container');
  const timeSearchContainer = document.getElementById('time-search-container');
  const timeText = document.getElementById('time-text');
  const searchContainer = document.createElement('div'); // Container for input + icon
  const searchInput = document.createElement('input');    // Search input element
  const searchIcon = document.getElementById('search-icon');       // Search icon

  // ========= BACKGROUND IMAGES =========

  const API_KEY = "53632271-fbaa470a55eb5593c7531f406";


  // favorites 

  let currentImage = null;
  const storageArea = (chrome.storage && chrome.storage.session) ? chrome.storage.session : chrome.storage.local;

  async function getFavorites() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['favoriteCats'], (result) => {
        resolve(result.favoriteCats || []);
      });
    });
  }

  let currentTabId = null;

  async function getCurrentTabId() {
    return new Promise((resolve) => {
      chrome.tabs.getCurrent((tab) => {
        resolve(tab?.id ?? null);
      });
    });
  }

  async function getSelectedWallpaper(tabId) {
    return new Promise((resolve) => {
      storageArea.get(['selectedByTab'], (result) => {
        const map = result.selectedByTab || {};
        resolve(tabId && map[tabId] ? map[tabId] : null);
      });
    });
  }

  async function clearSelectedWallpaper(tabId) {
    return new Promise((resolve) => {
      storageArea.get(['selectedByTab'], (result) => {
        const map = result.selectedByTab || {};
        if (tabId && map[tabId]) {
          delete map[tabId];
          storageArea.set({ selectedByTab: map }, () => resolve());
        } else {
          resolve();
        }
      });
    });
  }

  async function saveFavorite(image) {
    try {
      const favorites = await getFavorites();
      
      // Check if already favorited
      if (favorites.some(fav => fav.id === image.id)) {
        console.log('Image already in favorites');
        return false;
      }

      const normalized = {
        id: image.id,
        user: image.user || "",
        preview: image.preview || image.medium || image.large || "",
        medium: image.medium || image.preview || image.large || "",
        large: image.large || image.medium || image.preview || ""
      };

      favorites.push(normalized);
      
      return new Promise((resolve) => {
        chrome.storage.local.set({ favoriteCats: favorites }, () => {
          console.log('Image saved to favorites!');
          resolve(true);
        });
      });
    } catch (error) {
      console.error('Error saving favorite:', error);
      return false;
    }
  }

  async function removeFavorite(imageId) {
    try {
      let favorites = await getFavorites();
      favorites = favorites.filter(fav => fav.id !== imageId);
      
      return new Promise((resolve) => {
        chrome.storage.local.set({ favoriteCats: favorites }, () => {
          console.log('Image removed from favorites');
          resolve(true);
        });
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
  }

  async function isFavorited(imageId) {
    const favorites = await getFavorites();
    return favorites.some(fav => fav.id === imageId);
  }


  // populate images with urls 
  async function getCatPics() {
    var images = [];  // array of urls  

    try {

      // parameters for api request
      const params = new URLSearchParams();
      params.set('key', API_KEY);
      params.set('q', 'aesthetic cat cute kitty kitten cats pretty soft domestic cat');
      params.set('image_type', 'photo');
      params.set('orientation', 'horizontal');
      params.set('safesearch', 'true');
      params.set('page', String(Math.floor(Math.random() * 4) + 1));
      params.set('per_page', '100');
      //params.set('editors_choice',true);

      // make request
      const response = await fetch(`https://pixabay.com/api/?${params}`);

      // check if the request went throguh 
      
      if (!response.ok){
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.hits || data.hits.length === 0) {
        throw new Error("No images found :(");
      }

      images = data.hits.map(hit => ({
        preview: hit.previewURL,
        medium: hit.webformatURL,
        large: hit.largeImageURL,
        id: hit.id,
        user: hit.user
      }));

      return images;

    }

    catch (error) {
      console.error(`Error in getting images from Pixabay: ${error}`);
      throw error;
    }

  };

  async function fetchImageById(id) {
    try {
      const params = new URLSearchParams();
      params.set('key', API_KEY);
      params.set('id', String(id));
      const response = await fetch(`https://pixabay.com/api/?${params}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      if (!data.hits || data.hits.length === 0) return null;
      const hit = data.hits[0];
      return {
        preview: hit.previewURL,
        medium: hit.webformatURL,
        large: hit.largeImageURL,
        id: hit.id,
        user: hit.user
      };
    } catch (error) {
      console.error('Error fetching image by id:', error);
      return null;
    }
  }

  async function updateFavorite(image) {
    try {
      const favorites = await getFavorites();
      const updated = favorites.map((fav) => (fav.id === image.id ? { ...fav, ...image } : fav));
      chrome.storage.local.set({ favoriteCats: updated }, () => {});
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  }

  async function applyImage(image) {
    if (!image) return;

    const normalized = {
      ...image,
      preview: image.preview || image.medium || image.large || "",
      medium: image.medium || image.preview || image.large || "",
      large: image.large || image.medium || image.preview || ""
    };

    currentImage = normalized;
    const isFav = await isFavorited(currentImage.id);
    updateLikeButton(isFav);

    backgroundContainer.style.transition = 'none';
    backgroundContainer.style.filter = 'blur(5px)';
    backgroundContainer.style.transform = 'scale(1.15)';
    backgroundContainer.offsetHeight;
    backgroundContainer.style.transition = 'filter 0.8s ease-out';

    if (currentImage.preview) {
      backgroundContainer.style.backgroundImage = `url('${currentImage.preview}')`;
    } else if (currentImage.medium) {
      backgroundContainer.style.backgroundImage = `url('${currentImage.medium}')`;
    }

    if (currentImage.large) {
      const highQualityImg = new Image();
      highQualityImg.src = currentImage.large;
      highQualityImg.onload = function () {
        backgroundContainer.style.backgroundImage = `url('${currentImage.large}')`;
        backgroundContainer.style.filter = 'blur(0px)';
      };
      highQualityImg.onerror = async function () {
        // Attempt to refresh stale URLs for older favorites.
        if (currentImage.id) {
          const refreshed = await fetchImageById(currentImage.id);
          if (refreshed?.large) {
            const merged = { ...currentImage, ...refreshed };
            await updateFavorite(merged);
            const retryImg = new Image();
            retryImg.src = merged.large;
            retryImg.onload = function () {
              backgroundContainer.style.backgroundImage = `url('${merged.large}')`;
              backgroundContainer.style.filter = 'blur(0px)';
            };
            retryImg.onerror = function () {
              backgroundContainer.style.filter = 'blur(0px)';
            };
            return;
          }
        }
        backgroundContainer.style.filter = 'blur(0px)';
      };
    }
  }


  async function setBgImg() {

    try {
      const selected = await getSelectedWallpaper(currentTabId);
      if (selected) {
        await applyImage(selected);
        if (currentTabId) {
          await clearSelectedWallpaper(currentTabId);
        }
        return;
      }
      
      var imageUrls = await getCatPics(); 

      if (imageUrls.length === 0) {
        throw new Error("No images available"); 
      }

      const randomIndex = Math.floor(Math.random() * imageUrls.length);
      
      

      // loading blur and then wait until loaded 
      const selectedImage = imageUrls[randomIndex];
      await applyImage(selectedImage);

    }

    catch (error) {
      console.error(`Error getting the image: ${error}`);
      throw error;
      
    }
    
  }
  
  (async () => {
    currentTabId = await getCurrentTabId();
    await setBgImg();
  })();
  timeText.style.color = 'white';


  // ========= TIME DISPLAY =========
  function updateTime() {
    const now = new Date();
    var hours = now.getHours().toString().padStart(2, '0');
    //12-hour time 
    if (hours > 12){
      hours = hours-12;
    }
    const minutes = now.getMinutes().toString().padStart(2, '0');
    timeText.textContent = `${hours}:${minutes}`;
  }
  updateTime();
  setInterval(updateTime,60000);


  // ========= SEARCH BAR SETUP =========
  searchInput.style.caretColor = 'black';
  searchInput.placeholder = 'Search Google...';
  searchInput.id = 'search-input';
  searchInput.style.width = '400px';
  searchInput.style.height = '40px';
  searchInput.autocomplete = 'off';

  // When typing (optional behavior)
  searchInput.addEventListener('input', function () {
    const query = searchInput.value.trim();
    const googleSearchURL = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  });

  // Setup container
  searchContainer.style.position = 'relative';

  // Search icon
  searchIcon.style.pointerEvents = 'auto';
  searchIcon.style.cursor = "pointer";


  // Append elements to container
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(searchIcon);


  // ========= FORM SETUP =========
  const searchForm = document.createElement('form');
  searchForm.id = 'search-form';

  searchForm.appendChild(searchContainer);
  timeSearchContainer.appendChild(searchForm);

  searchIcon.addEventListener('click', function () {
    event.preventDefault();
    const query = searchInput.value.trim();

    if (query.length > 0) {
      const googleSearchURL = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      window.location.href = googleSearchURL;
    }
  });


  // Submit form → Search Google
  searchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const query = searchInput.value.trim();

    if (query.length > 0) {
      const googleSearchURL = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      window.location.href = googleSearchURL; // Redirect in same tab
    }
  });


  function openNewTab(url) {
    chrome.tabs?.create({ url });
  }

  // Favorite button 

   var likeButton = document.getElementById("like-button");


  function updateLikeButton(isFavorited) {
    if (isFavorited) {
      likeButton.classList.add("active");
    } else {
      likeButton.classList.remove("active");
    }
  }


  likeButton.addEventListener("click", function() {
    this.classList.toggle("active");
    
  });

  likeButton.addEventListener("click", async function() {
    if (!currentImage) {
      console.log('No image loaded yet');
      return;
    }

    const isFav = await isFavorited(currentImage.id);
    
    if (isFav) {
      // Remove from favorites
      await removeFavorite(currentImage.id);
      this.classList.remove("active");
    } else {
      // Add to favorites
      const saved = await saveFavorite(currentImage);
      if (saved) {
        this.classList.add("active");
      }
    }
  });

  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'session' && areaName !== 'local') return;
    if (!currentTabId) return;

    if (changes.selectedByTab) {
      const newMap = changes.selectedByTab.newValue || {};
      const newImage = newMap[currentTabId] || null;
      if (newImage) {
        await applyImage(newImage);
        await clearSelectedWallpaper(currentTabId);
      }
    }
  });


});
