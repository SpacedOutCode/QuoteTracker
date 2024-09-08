// Global variables
let quotes = [];
let sortConfig = { key: null, direction: "ascending" };

// Constants
const STATUS_OPTIONS = ["Quote Signed", "In Production", "Finished", "Picked Up", "Shipped", "Delivered"];
const TAG_OPTIONS = ["Painting", "Painted", "UV Finished", "Masked", "Carved", "Letter Painted", "Edges Painted", "Hardware Installed", "Wrapped Up", "Done"];

// DOM Elements
const DOM = {
  quoteForm: () => document.getElementById("quoteForm"),
  quoteTableBody: () => document.getElementById("quoteTableBody"),
  missingFieldsPopup: () => document.getElementById("missingFieldsPopup"),
  missingFieldsContent: () => document.getElementById("missingFieldsContent"),
  confirmationPopup: () => document.getElementById("confirmationPopup"),
  quoteDetailsPopup: () => document.getElementById("quoteDetailsPopup")
};

// Initialization
function initializeApp() {
  QuoteManager.loadQuotes();
  checkForMissingFields();
  displayQuotes();
  setupSortListeners();
  DOM.quoteForm().addEventListener("submit", handleFormSubmit);
}

// Quote Management
const QuoteManager = {
  addQuote(formData) {
    const quote = this.createQuoteObject(formData);
    quotes.push(quote);
    this.saveQuotes();
    displayQuotes();
    DOM.quoteForm().reset();
  },

  createQuoteObject(formData) {
    const dueDate = new Date(formData.dateSigned);
    dueDate.setDate(dueDate.getDate() + formData.leadTime * 7);

    return {
      id: Date.now(),
      name: formData.name,
      dateSigned: formData.dateSigned,
      leadTime: formData.leadTime,
      size: formData.size,
      price: formData.price,
      link: formData.link,
      dueDate: dueDate.toISOString().split("T")[0],
      status: "Quote Signed",
      tags: formData.tags
    };
  },

  removeQuote(id) {
    quotes = quotes.filter(quote => quote.id != id);
    this.saveQuotes();
    displayQuotes();
  },

  updateQuoteStatus(id, newStatus) {
    const quote = quotes.find(q => q.id == id);
    if (quote) {
      quote.status = newStatus;
      this.saveQuotes();
      this.updateStatusDropdown(id, newStatus);
    }
  },

  updateStatusDropdown(id, newStatus) {
    const dropdown = document.querySelector(`.status-dropdown[data-id="${id}"]`);
    if (dropdown) {
      dropdown.value = newStatus;
      updateDropdownStyle(dropdown);
    }
  },

  saveQuotes() {
    localStorage.setItem("quotes", JSON.stringify(quotes));
  },

  loadQuotes() {
    const storedQuotes = localStorage.getItem("quotes");
    if (storedQuotes) {
      quotes = JSON.parse(storedQuotes);
    }
  }
};

// Display Functions
function displayQuotes() {
  const tableBody = DOM.quoteTableBody();
  tableBody.innerHTML = "";

  const sortedQuotes = sortQuotes(quotes);

  sortedQuotes.forEach(quote => {
    if (!quote) {
      console.error("Undefined quote encountered");
      return;
    }

    const row = createQuoteRow(quote);
    tableBody.appendChild(row);
  });

  addEventListenersToQuoteElements();
}

// Make sure to call initializeApp when the DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp);

function createQuoteRow(quote) {
  const row = document.createElement("tr");
  const dueDateClass = getDueDateClass(new Date(quote.dueDate));
  const dueDateText = dueDateClass === "due-date-overdue" ? "OVERDUE" : quote.dueDate;
  const statusDropdown = createStatusDropdown(quote);

  row.innerHTML = `
    <td><a href="${quote.link || "#"}" class="quote-name" data-id="${quote.id}" ${quote.link ? 'target="_blank"' : ""}>${quote.name || ""}</a></td>
    <td>${quote.leadTime || ""} weeks</td>
    <td>${quote.size || ""}</td>
    <td>$${quote.price ? parseFloat(quote.price).toFixed(2) : ""}</td>
    <td><p class="${dueDateClass}">${dueDateText || ""}</p></td>
    <td>${statusDropdown.outerHTML}</td>
    <td><button class="remove-btn" data-id="${quote.id}">Remove</button></td>
  `;

  return row;
}

function addEventListenersToQuoteElements() {
  document.querySelectorAll(".quote-name").forEach(link => {
    link.addEventListener("click", function(e) {
      e.preventDefault();
      PopupManager.showQuoteDetails(this.dataset.id);
    });
  });

  document.querySelectorAll(".remove-btn").forEach(button => {
    button.addEventListener("click", function() {
      PopupManager.showConfirmationPopup(this.dataset.id);
    });
  });

  document.querySelectorAll(".status-dropdown").forEach(dropdown => {
    const quoteId = dropdown.dataset.id;
    const quote = quotes.find(q => q.id == quoteId);
    if (quote) {
      dropdown.value = quote.status;
    }

    dropdown.addEventListener("change", function() {
      QuoteManager.updateQuoteStatus(this.dataset.id, this.value);
      updateDropdownStyle(this);
    });
  });
}

// Utility Functions
function getDueDateClass(dueDate) {
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "due-date-overdue";
  if (diffDays <= 7) return "due-date-red";
  if (diffDays <= 14) return "due-date-yellow";
  return "due-date-green";
}

function createStatusDropdown(quote) {
  const select = document.createElement("select");
  select.classList.add("status-dropdown", `status-${quote.status.replace(/\s+/g, "-")}`);
  select.dataset.id = quote.id;

  STATUS_OPTIONS.forEach(status => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = status === quote.status;
    select.appendChild(option);
  });

  return select;
}

function updateDropdownStyle(dropdown) {
  STATUS_OPTIONS.forEach(status => {
    dropdown.classList.remove(`status-${status.replace(/\s+/g, "-")}`);
  });
  dropdown.classList.add(`status-${dropdown.value.replace(/\s+/g, "-")}`);
}

// Sorting
function setupSortListeners() {
  const headers = document.querySelectorAll("th[data-sort]");
  headers.forEach(header => {
    header.addEventListener("click", () => {
      const key = header.dataset.sort;
      if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === "ascending" ? "descending" : "ascending";
      } else {
        sortConfig.key = key;
        sortConfig.direction = "ascending";
      }
      displayQuotes();
    });
  });
}

function sortQuotes(quotesToSort) {
  return quotesToSort.sort((a, b) => {
    let comparison = 0;
    switch (sortConfig.key) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "dateSigned":
        comparison = new Date(a.dateSigned) - new Date(b.dateSigned);
        break;
      case "leadTime":
        comparison = a.leadTime - b.leadTime;
        break;
      case "size":
        const sizeOrder = { small: 1, medium: 2, large: 3 };
        comparison = sizeOrder[a.size] - sizeOrder[b.size];
        break;
      case "price":
        comparison = a.price - b.price;
        break;
      case "dueDate":
        comparison = new Date(a.dueDate) - new Date(b.dueDate);
        break;
      case "status":
        const statusOrder = {
          "Quote Signed": 1,
          "In Production": 2,
          Finished: 3,
          "Picked Up": 4,
          Shipped: 5,
          Delivered: 6,
        };
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
    }
    return sortConfig.direction === "ascending" ? comparison : -comparison;
  });
}

// Event Handlers
function handleFormSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const quoteData = {
    name: formData.get("name"),
    dateSigned: formData.get("dateSigned"),
    leadTime: parseInt(formData.get("leadTime")),
    size: formData.get("size"),
    price: parseFloat(formData.get("price")),
    link: formData.get("link"),
    tags: formData.getAll("tags")
  };
  QuoteManager.addQuote(quoteData);
}

// Popup Management
const PopupManager = {
  showMissingFieldsPopup(incompleteQuotes) {
    const popup = DOM.missingFieldsPopup();
    const content = DOM.missingFieldsContent();
    content.innerHTML = "";

    incompleteQuotes.forEach(quote => {
      const quoteDiv = document.createElement("div");
      quoteDiv.innerHTML = this.createMissingFieldsForm(quote);
      content.appendChild(quoteDiv);
    });

    const updateAllButton = document.createElement("button");
    updateAllButton.textContent = "Update All";
    updateAllButton.id = "updateAllButton";
    updateAllButton.classList.add("update-all-btn");
    content.appendChild(updateAllButton);

    popup.style.display = "block";

    document.getElementById("updateAllButton").addEventListener("click", this.updateAllQuotes);
    document.getElementById("closeMissingFields").addEventListener("click", () => {
      popup.style.display = "none";
    });
  },

  createMissingFieldsForm(quote) {
    return `
      <h3>${quote.name || "Unnamed Quote"}</h3>
      <form class="missing-fields-form" data-id="${quote.id}">
        ${!quote.name ? '<input type="text" name="name" placeholder="Name" required><br>' : ""}
        ${!quote.dateSigned ? '<input type="date" name="dateSigned" required><br>' : ""}
        ${!quote.leadTime ? '<input type="number" name="leadTime" placeholder="Lead Time (weeks)" required><br>' : ""}
        ${!quote.size ? `
          <select name="size" required>
            <option value="">Select Size</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select><br>
        ` : ""}
        ${!quote.price ? '<input type="number" name="price" step="0.01" placeholder="Price" required><br>' : ""}
        ${!quote.link ? '<input type="url" name="link" placeholder="Quote Link" required><br>' : ""}
        ${!quote.status ? `
          <select name="status" required>
            <option value="">Select Status</option>
            ${STATUS_OPTIONS.map(status => `<option value="${status}">${status}</option>`).join("")}
          </select><br>
        ` : ""}
        ${quote.tags.length === 0 ? `
          <select name="tags" multiple required>
            ${TAG_OPTIONS.map(tag => `<option value="${tag}">${tag}</option>`).join("")}
          </select><br>
        ` : ""}
      </form>
    `;
  },

  updateAllQuotes() {
    const forms = document.querySelectorAll(".missing-fields-form");
    forms.forEach(form => {
      PopupManager.updateQuoteFields(form);
    });
    QuoteManager.saveQuotes();
    DOM.missingFieldsPopup().style.display = "none";
    displayQuotes();
  },

  updateQuoteFields(form) {
    const quoteId = form.dataset.id;
    const quote = quotes.find(q => q.id == quoteId);

    if (quote) {
      for (let input of form.elements) {
        if (input.name && input.value) {
          if (input.name === "tags") {
            quote[input.name] = Array.from(input.selectedOptions).map(option => option.value);
          } else if (input.name === "leadTime" || input.name === "price") {
            quote[input.name] = parseFloat(input.value);
          } else {
            quote[input.name] = input.value;
          }
        }
      }
    }
  },

  showConfirmationPopup(quoteId) {
    const popup = DOM.confirmationPopup();
    popup.style.display = "flex";

    document.getElementById("confirmDelete").onclick = function() {
      QuoteManager.removeQuote(quoteId);
      popup.style.display = "none";
    };

    document.getElementById("cancelDelete").onclick = function() {
      popup.style.display = "none";
    };
  },

  showQuoteDetails(quoteId) {
    const quote = quotes.find(q => q.id == quoteId);
    if (quote) {
      const detailsHtml = this.createQuoteDetailsHtml(quote);
      const detailsPopup = DOM.quoteDetailsPopup();
      detailsPopup.innerHTML = detailsHtml;
      detailsPopup.style.display = "flex";
      document.body.classList.add("popup-open");

      this.setupQuoteDetailsEventListeners(quote);
    }
  },

  createQuoteDetailsHtml(quote) {
    return `
      <div class="popup-content">
        <h2>Quote Details: ${quote.name}</h2>
        <p><strong>Date Signed:</strong> ${quote.dateSigned}</p>
        <p><strong>Lead Time:</strong> ${quote.leadTime} weeks</p>
        <p><strong>Size:</strong> ${quote.size}</p>
        <p><strong>Price:</strong> $${parseFloat(quote.price).toFixed(2)}</p>
        <p><strong>Due Date:</strong> ${quote.dueDate}</p>
        <p><strong>Status:</strong> ${quote.status}</p>
        <div style="gap: 0;"><strong>Tags:</strong> 
          <div id="tagContainer" style="padding: 10px;">
            ${quote.tags.map(tag => `<span class="tag">${tag}<span class="tag-remove" data-tag="${tag}">×</span></span>`).join("")}
          </div>
          <input type="text" id="newTag" placeholder="Add new tag">
          <button id="addTag">+</button>
        </div>
        <p><strong>Link:</strong> ${quote.link ? `<a href="${quote.link}" target="_blank" style="text-wrap: wrap;">${quote.link}</a>` : "No link provided"}</p>
        <button id="closeDetails">Close</button>
      </div>
    `;
  },

  setupQuoteDetailsEventListeners(quote) {
    document.getElementById("closeDetails").addEventListener("click", function() {
      DOM.quoteDetailsPopup().style.display = "none";
      document.body.classList.remove("popup-open");
    });

    document.getElementById("addTag").addEventListener("click", function() {
      const newTag = document.getElementById("newTag").value.trim();
      if (newTag && !quote.tags.includes(newTag)) {
        quote.tags.push(newTag);
        PopupManager.updateTagDisplay(quote);
        QuoteManager.saveQuotes();
      }
      document.getElementById("newTag").value = "";
    });

    document.getElementById("tagContainer").addEventListener("click", function(e) {
      if (e.target.classList.contains("tag-remove")) {
        const tagToRemove = e.target.getAttribute("data-tag");
        quote.tags = quote.tags.filter(tag => tag !== tagToRemove);
        PopupManager.updateTagDisplay(quote);
        QuoteManager.saveQuotes();
      }
    });
  },

  updateTagDisplay(quote) {
    const tagContainer = document.getElementById("tagContainer");
    tagContainer.innerHTML = quote.tags
      .map(tag => `<span class="tag">${tag}<span class="tag-remove" data-tag="${tag}">×</span></span>`)
      .join("");
  }
};

// Missing Fields Check
function checkForMissingFields() {
  const incompleteQuotes = quotes.filter(quote => {
    return !quote.name || !quote.dateSigned || !quote.leadTime || !quote.size || !quote.price || !quote.status || !quote.link || quote.tags.length === 0;
  });

  if (incompleteQuotes.length > 0) {
    PopupManager.showMissingFieldsPopup(incompleteQuotes);
  }
}

// Initialize the application
initializeApp();