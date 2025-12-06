// Weinberg Book List - Main JavaScript

// Column Configuration
const columns = [
  { key: 'title', label: 'タイトル', sortable: true, sortKey: 'titleYomigana' },
  { key: 'author', label: '著者', sortable: false },
  { key: 'year', label: '出版年', sortable: true, sortKey: 'year' },
  { key: 'publisher', label: '出版社', sortable: false },
  { key: 'isbn', label: 'ISBN', sortable: false },
  { key: 'originalTitle', label: '原著タイトル', sortable: true, sortKey: 'originalTitle', linkUrlKey: 'authorSiteUrl' },
  { key: 'originalYear', label: '原著出版年', sortable: true, sortKey: 'originalYear' },
  { key: 'originalPublisher', label: '原著出版社', sortable: false },
  { key: 'category', label: 'カテゴリ', sortable: false }
];

// Application State
const state = {
  books: [],
  isLoading: true,
  error: null,
  sortColumn: 'year',
  sortOrder: 'asc'
};

// DOM Elements
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const tableElement = document.getElementById('book-table');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');

/**
 * Fetch book data from JSON file
 * @returns {Promise<Array>} Array of book objects
 */
async function fetchBooks() {
  const response = await fetch('data/books.json');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.books;
}

/**
 * Sort books by a given key
 * @param {Array} books - Array of book objects
 * @param {string} key - The key to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted array (new array, does not mutate original)
 */
function sortBooks(books, key, order = 'asc') {
  return [...books].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    // Handle null values - push to end regardless of sort order
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      // Use localeCompare for string comparison with Japanese locale
      comparison = String(aVal).localeCompare(String(bVal), 'ja');
    }

    return order === 'desc' ? -comparison : comparison;
  });
}

/**
 * Generate table header with sortable columns
 */
function renderTableHeader() {
  const headerRow = document.createElement('tr');

  columns.forEach(column => {
    const th = document.createElement('th');
    th.textContent = column.label;
    th.dataset.key = column.key;

    if (column.sortable) {
      th.classList.add('sortable');
      th.dataset.sortKey = column.sortKey;
      th.addEventListener('click', (e) => {
        // Don't trigger sort when clicking on resizer
        if (!e.target.classList.contains('resizer')) {
          handleSort(column.sortKey);
        }
      });
    }

    // Add resizer element
    const resizer = document.createElement('div');
    resizer.classList.add('resizer');
    th.appendChild(resizer);

    headerRow.appendChild(th);
  });

  tableHeader.appendChild(headerRow);

  // Initialize column resizing
  initColumnResize();
}

/**
 * Initialize column resize functionality
 */
function initColumnResize() {
  const resizers = document.querySelectorAll('#book-table th .resizer');

  resizers.forEach(resizer => {
    let startX, startWidth, th;

    resizer.addEventListener('mousedown', (e) => {
      th = resizer.parentElement;
      startX = e.pageX;
      startWidth = th.offsetWidth;
      resizer.classList.add('resizing');
      tableElement.classList.add('resizing');

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    });

    function onMouseMove(e) {
      const width = startWidth + (e.pageX - startX);
      if (width > 30) {
        th.style.width = width + 'px';
      }
    }

    function onMouseUp() {
      resizer.classList.remove('resizing');
      tableElement.classList.remove('resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  });
}

/**
 * Format cell value, returning "—" for null/undefined/empty values
 * @param {*} value - The cell value
 * @returns {string} Formatted value
 */
function formatCellValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}

/**
 * Create a cell element for a book row
 * @param {Object} book - The book object
 * @param {Object} column - The column configuration
 * @returns {HTMLTableCellElement} The table cell element
 */
function createCell(book, column) {
  const td = document.createElement('td');
  const value = book[column.key];

  if (column.key === 'title') {
    const amazonUrl = book.amazonUrl;
    if (amazonUrl) {
      const link = document.createElement('a');
      link.href = amazonUrl;
      link.textContent = formatCellValue(value);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      td.appendChild(link);
    } else {
      td.textContent = formatCellValue(value);
    }
  } else if (column.isLink && value) {
    // Link column: value is the URL, linkText is the display text
    const link = document.createElement('a');
    link.href = value;
    link.textContent = column.linkText;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    td.appendChild(link);
  } else if (column.linkUrlKey && value) {
    // Linked value column: value is displayed, linkUrlKey provides the URL
    const url = book[column.linkUrlKey];
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.textContent = value;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      td.appendChild(link);
    } else {
      td.textContent = formatCellValue(value);
    }
  } else {
    td.textContent = formatCellValue(value);
  }

  return td;
}

/**
 * Render table body with book data
 * @param {Array} books - Array of book objects to display
 */
function renderTableBody(books) {
  // Clear existing rows
  tableBody.innerHTML = '';

  books.forEach(book => {
    const row = document.createElement('tr');

    columns.forEach(column => {
      const cell = createCell(book, column);
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });
}

/**
 * Update sort indicator in table header
 */
function updateSortIndicator() {
  // Remove existing sort indicators
  const headers = tableHeader.querySelectorAll('th');
  headers.forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });

  // Add indicator to current sort column
  const currentHeader = tableHeader.querySelector(`th[data-sort-key="${state.sortColumn}"]`);
  if (currentHeader) {
    currentHeader.classList.add(state.sortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
  }
}

/**
 * Handle sort column click
 * @param {string} sortKey - The key to sort by
 */
function handleSort(sortKey) {
  // Toggle order if same column, otherwise reset to ascending
  if (state.sortColumn === sortKey) {
    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortColumn = sortKey;
    state.sortOrder = 'asc';
  }

  // Sort books using the appropriate key
  const sortedBooks = sortBooks(state.books, sortKey, state.sortOrder);

  // Re-render the table with sorted data
  renderTableBody(sortedBooks);

  // Update sort indicator in header
  updateSortIndicator();

  console.log(`Sorted by: ${sortKey} (${state.sortOrder})`);
}

/**
 * Update UI based on current state
 */
function updateUI() {
  if (state.isLoading) {
    loadingElement.style.display = 'block';
    errorElement.style.display = 'none';
    tableElement.style.display = 'none';
  } else if (state.error) {
    loadingElement.style.display = 'none';
    errorElement.style.display = 'block';
    errorElement.textContent = `エラー: ${state.error}`;
    tableElement.style.display = 'none';
  } else {
    loadingElement.style.display = 'none';
    errorElement.style.display = 'none';
    tableElement.style.display = 'table';
  }
}

/**
 * Initialize the application
 */
async function init() {
  try {
    state.isLoading = true;
    updateUI();

    // Render table header
    renderTableHeader();

    state.books = await fetchBooks();
    state.isLoading = false;
    state.error = null;

    // Sort by Japanese publication year (ascending) for initial display
    const sortedBooks = sortBooks(state.books, state.sortColumn, state.sortOrder);

    // Render table body with sorted data
    renderTableBody(sortedBooks);

    // Show initial sort indicator
    updateSortIndicator();

    updateUI();
    console.log(`Loaded ${state.books.length} books`);
  } catch (error) {
    state.isLoading = false;
    state.error = 'データの読み込みに失敗しました。ページを再読み込みしてください。';
    updateUI();
    console.error('Failed to load books:', error);
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
