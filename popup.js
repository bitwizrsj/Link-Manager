document.addEventListener('DOMContentLoaded', function () {
    const addLinkButton = document.getElementById('add-link-button');
    const linkForm = document.getElementById('link-form');
    const saveLinkButton = document.getElementById('save-link');
    const linkTitleInput = document.getElementById('link-title');
    const linkUrlInput = document.getElementById('link-url');
    const linkCategorySelect = document.getElementById('link-category');
    const newCategoryInput = document.getElementById('new-category');
    const categoriesDiv = document.getElementById('categories');
    const searchInput = document.getElementById('search');
    const linksTableBody = document.getElementById('links-table').getElementsByTagName('tbody')[0];

    addLinkButton.addEventListener('click', function () {
        linkForm.style.display = 'block';
    });

    saveLinkButton.addEventListener('click', function () {
        const title = linkTitleInput.value;
        const url = linkUrlInput.value;
        const category = linkCategorySelect.value || newCategoryInput.value;
        const dateAdded = new Date().toLocaleString();

        if (title && url && category) {
            const link = {
                title,
                url,
                category,
                dateAdded
            };

            saveLink(link);
            linkTitleInput.value = '';
            linkUrlInput.value = '';
            newCategoryInput.value = '';
            linkForm.style.display = 'none';
            renderLinks();
            renderCategories();
        } else {
            alert('Please fill in all fields.');
        }
    });

    searchInput.addEventListener('input', function () {
        renderLinks();
    });

    function saveLink(link) {
        chrome.storage.local.get(['links'], function (result) {
            const links = result.links || [];
            links.push(link);
            chrome.storage.local.set({ links: links }, function () {
                renderLinks();
                renderCategories();
            });
        });
    }

    function deleteLink(index) {
        chrome.storage.local.get(['links'], function (result) {
            const links = result.links || [];
            links.splice(index, 1);
            chrome.storage.local.set({ links: links }, function () {
                renderLinks();
            });
        });
    }

    function renderLinks() {
        chrome.storage.local.get(['links'], function (result) {
            const links = result.links || [];
            const searchQuery = searchInput.value.toLowerCase();
            linksTableBody.innerHTML = '';

            links.forEach((link, index) => {
                if (
                    link.title.toLowerCase().includes(searchQuery) ||
                    link.url.toLowerCase().includes(searchQuery) ||
                    link.category.toLowerCase().includes(searchQuery)
                ) {
                    const row = linksTableBody.insertRow();
                    row.insertCell(0).innerText = link.title;
                    row.insertCell(1).innerHTML = `<a href="${link.url}" target="_blank">${link.url}</a>`;
                    row.insertCell(2).innerText = link.category;
                    row.insertCell(3).innerText = link.dateAdded;
                    const actionsCell = row.insertCell(4);
                    actionsCell.innerHTML = `
                        <button class="copy-link" data-index="${index}">Copy</button>
                        <button class="delete-link" data-index="${index}">Delete</button>
                        <button class="edit-link" data-index="${index}">Edit</button>
                    `;

                    actionsCell.querySelector('.delete-link').addEventListener('click', function () {
                        deleteLink(index);
                    });

                    actionsCell.querySelector('.copy-link').addEventListener('click', function () {
                        navigator.clipboard.writeText(link.url).then(() => {
                            alert('Link copied to clipboard.');
                        });
                    });

                    actionsCell.querySelector('.edit-link').addEventListener('click', function () {
                        linkTitleInput.value = link.title;
                        linkUrlInput.value = link.url;
                        newCategoryInput.value = link.category;
                        linkForm.style.display = 'block';
                        deleteLink(index);
                    });
                }
            });
        });
    }

    function renderCategories() {
        chrome.storage.local.get(['links'], function (result) {
            const links = result.links || [];
            const categories = [...new Set(links.map(link => link.category))];

            categoriesDiv.innerHTML = '';
            linkCategorySelect.innerHTML = '<option value="">Select Category</option>';

            categories.forEach(category => {
                const categoryButton = document.createElement('button');
                categoryButton.innerText = category;
                categoryButton.addEventListener('click', function () {
                    filterLinksByCategory(category);
                });
                categoriesDiv.appendChild(categoryButton);

                const categoryOption = document.createElement('option');
                categoryOption.value = category;
                categoryOption.innerText = category;
                linkCategorySelect.appendChild(categoryOption);
            });
        });
    }

    function filterLinksByCategory(category) {
        chrome.storage.local.get(['links'], function (result) {
            const links = result.links || [];
            const filteredLinks = links.filter(link => link.category === category);
            renderFilteredLinks(filteredLinks);
        });
    }

    function renderFilteredLinks(links) {
        linksTableBody.innerHTML = '';

        links.forEach((link, index) => {
            const row = linksTableBody.insertRow();
            row.insertCell(0).innerText = link.title;
            row.insertCell(1).innerHTML = `<a href="${link.url}" target="_blank">${link.url}</a>`;
            row.insertCell(2).innerText = link.category;
            row.insertCell(3).innerText = link.dateAdded;
            const actionsCell = row.insertCell(4);
            actionsCell.innerHTML = `
                <button class="copy-link" data-index="${index}">Copy</button>
                <button class="delete-link" data-index="${index}">Delete</button>
                <button class="edit-link" data-index="${index}">Edit</button>
            `;

            actionsCell.querySelector('.delete-link').addEventListener('click', function () {
                deleteLink(index);
            });

            actionsCell.querySelector('.copy-link').addEventListener('click', function () {
                navigator.clipboard.writeText(link.url).then(() => {
                    alert('Link copied to clipboard.');
                });
            });

            actionsCell.querySelector('.edit-link').addEventListener('click', function () {
                linkTitleInput.value = link.title;
                linkUrlInput.value = link.url;
                newCategoryInput.value = link.category;
                linkForm.style.display = 'block';
                deleteLink(index);
            });
        });
    }

    // Verify that the chrome.storage API is available before proceeding
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        renderLinks();
        renderCategories();
    } else {
        console.error('chrome.storage.local is not available.');
    }
});
