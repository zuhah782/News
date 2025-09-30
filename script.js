
const API_KEY = '402f4eab48ffbc1170de4ffd896b8d46';
const BASE_URL = 'https://gnews.io/api/v4/'; // Base URL for GNews API

// --- DOM Elements ---
const newsContainer = document.getElementById('news-container');
const categoriesContainer = document.getElementById('categories');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-btn');
const loadingMessage = document.getElementById('loading-message');
const errorMessage = document.getElementById('error-message');
const errorDetails = document.getElementById('error-details');

// --- Global State ---
let currentCategory = 'general'; // Default category
let currentSearchQuery = '';

// --- Utility Functions ---

/**
 * Shows a loading indicator.
 */
function showLoading() {
    loadingMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden'); // Hide any previous error
    newsContainer.innerHTML = ''; // Clear existing news
}

/**
 * Hides the loading indicator.
 */
function hideLoading() {
    loadingMessage.classList.add('hidden');
}

/**
 * Displays an error message to the user.
 * @param {string} message - The main error message.
 * @param {string} [details=''] - Optional detailed error information.
 */
function showError(message, details = '') {
    errorMessage.classList.remove('hidden');
    errorDetails.textContent = details;
    newsContainer.innerHTML = ''; // Clear news on error
    console.error('API Error:', message, details);
}

/**
 * Hides any active error messages.
 */
function hideError() {
    errorMessage.classList.add('hidden');
    errorDetails.textContent = '';
}

/**
 * Formats a date string into a human-readable format.
 * @param {string} dateString - The date string from the API (e.g., "2023-10-27T10:00:00Z").
 * @returns {string} Formatted date (e.g., "Oct 27, 2023").
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown Date';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid Date';
    }
}

/**
 * Placeholder image URL for when an article has no image.
 * Using placehold.co for a dynamic placeholder.
 */
function getPlaceholderImageUrl(width = 600, height = 400) {
    return `https://placehold.co/${width}x${height}/F0F0F0/888888?text=No+Image`;
}


// --- Core Fetching Logic ---

/**
 * Fetches news articles from the GNews API.
 * @param {object} params - Query parameters for the API request.
 * Can contain 'category' or 'query'.
 */
async function fetchNews(params = {}) {
    showLoading();
    hideError();

    let url;
    if (params.query) {
        url = `${BASE_URL}search?q=${encodeURIComponent(params.query)}&lang=en&country=us&token=${API_KEY}`;
    } else {
        url = `${BASE_URL}top-headlines?lang=en&country=us&topic=${params.category || 'general'}&token=${API_KEY}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors ? errorData.errors.map(err => err.message).join(', ') : `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (Array.isArray(data.articles)) {
            displayArticles(data.articles);
        } else {
            showError('API response format unexpected.', 'Expected an array of articles.');
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        showError('Failed to load news.', error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Renders news articles on the page.
 * @param {Array<object>} articles - An array of article objects from the API.
 */
function displayArticles(articles) {
    newsContainer.innerHTML = ''; // Clear previous articles

    if (!articles || articles.length === 0) {
        newsContainer.innerHTML = '<p class="col-span-full text-center text-gray-600 p-4">No news articles found for this selection.</p>';
        return;
    }

    articles.forEach(article => {
        const articleDiv = document.createElement('div');
        articleDiv.classList.add('news-article');

        // Create image element with fallback
        const image = document.createElement('img');
        image.src = article.image || getPlaceholderImageUrl(); // GNews uses 'image'
        image.alt = article.title || 'News Article Image';
        image.onerror = () => { // Handle broken images
            image.src = getPlaceholderImageUrl();
            image.alt = 'Image failed to load, placeholder used.';
        };
        articleDiv.appendChild(image);

        // Create title
        const title = document.createElement('h2');
        const link = document.createElement('a');
        link.href = article.url;
        link.textContent = article.title || 'No Title Available';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        title.appendChild(link);
        articleDiv.appendChild(title);

        // Create description
        const description = document.createElement('p');
        description.textContent = article.description || 'No description available.';
        articleDiv.appendChild(description);

        // Create details (date and source)
        const details = document.createElement('p');
        details.classList.add('article-details');
        const formattedDate = formatDate(article.publishedAt);
        const sourceName = article.source?.name || 'Unknown Source'; // GNews has source.name
        details.textContent = `${sourceName}${formattedDate ? " • " + formattedDate : ""}`;
        articleDiv.appendChild(details);

        newsContainer.appendChild(articleDiv);
    });
}

// --- Event Handlers ---

/**
 * Initializes and handles click events for category buttons.
 */
function setupCategoryButtons() {
    const categories = ['General', 'Business', 'Technology', 'Sports', 'Health', 'Entertainment', 'Science'];

    categories.forEach(category => {
        const button = document.createElement('button');
        button.textContent = category;
        button.setAttribute('data-category', category.toLowerCase()); // Crucial for CSS styling
        categoriesContainer.appendChild(button);

        button.addEventListener('click', () => {
            // Remove 'active' class from all buttons
            document.querySelectorAll('#categories button').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add 'active' class to the clicked button
            button.classList.add('active');

            currentCategory = category.toLowerCase();
            currentSearchQuery = ''; // Clear search when changing category
            searchInput.value = ''; // Clear search input
            fetchNews({ category: currentCategory });
        });
    });

    // Automatically activate the 'General' button on initial load
    const defaultButton = document.querySelector('#categories button[data-category="general"]');
    if (defaultButton) {
        defaultButton.classList.add('active');
    }
}

/**
 * Handles the search button click and Enter key press.
 */
function handleSearch() {
    const query = searchInput.value.trim();
    if (query) {
        currentSearchQuery = query;
        currentCategory = ''; // Clear category when searching
        // Remove 'active' class from all category buttons
        document.querySelectorAll('#categories button').forEach(btn => {
            btn.classList.remove('active');
        });
        fetchNews({ query: currentSearchQuery });
    } else {
        // If search is empty, revert to current category or default
        if (currentCategory) {
            fetchNews({ category: currentCategory });
        } else {
            // If no category and empty search, load general news
            currentCategory = 'general';
            const defaultButton = document.querySelector('#categories button[data-category="general"]');
            if (defaultButton) {
                defaultButton.classList.add('active');
            }
            fetchNews({ category: currentCategory });
        }
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupCategoryButtons();
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });

    // Initial news fetch when the page loads
    fetchNews({ category: currentCategory });
});
