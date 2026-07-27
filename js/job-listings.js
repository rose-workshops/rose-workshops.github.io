(function () {
  var root = document.getElementById('job-listings');
  if (!root) {
    return;
  }

  var searchInput = document.getElementById('job-listings-search');
  var sheetUrl = root.getAttribute('data-sheet-url');
  var headers = {
    approved: 'Approved',
    deadline: 'Deadline',
    title: 'Title (very short job description)',
    institution: 'Institution / Company',
    url: 'URL to detailed job posting',
    location: 'Location(s)',
    description: 'Job description',
    contact: 'Contact Name and Email'
  };

  function parseCsv(csv) {
    var rows = [];
    var row = [];
    var value = '';
    var inQuotes = false;

    for (var i = 0; i < csv.length; i += 1) {
      var character = csv[i];
      var nextCharacter = csv[i + 1];

      if (inQuotes) {
        if (character === '"' && nextCharacter === '"') {
          value += '"';
          i += 1;
        } else if (character === '"') {
          inQuotes = false;
        } else {
          value += character;
        }
      } else if (character === '"') {
        inQuotes = true;
      } else if (character === ',') {
        row.push(value);
        value = '';
      } else if (character === '\n') {
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
      } else if (character !== '\r') {
        value += character;
      }
    }

    if (value || row.length) {
      row.push(value);
      rows.push(row);
    }

    return rows;
  }

  function rowObjects(rows) {
    if (!rows.length) {
      return [];
    }

    var headerRow = rows[0].map(function (header) {
      return header.trim();
    });

    return rows.slice(1).map(function (row) {
      return headerRow.reduce(function (entry, header, index) {
        entry[header] = row[index] ? row[index].trim() : '';
        return entry;
      }, {});
    });
  }

  function isApproved(entry) {
    var value = (entry[headers.approved] || '').toLowerCase();
    return ['approved', 'true', 'yes', 'y', '1'].indexOf(value) !== -1;
  }

  function isCurrent(entry) {
    var deadline = entry[headers.deadline] || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      return false;
    }

    var today = new Date().toISOString().slice(0, 10);
    return deadline >= today;
  }

  function hasRequiredColumns(entries) {
    if (!entries.length) {
      return false;
    }

    return headers.approved in entries[0] && headers.deadline in entries[0];
  }

  function renderEmpty(message) {
    root.innerHTML = '<p class="job-listings-status">' + message + '</p>';
  }

  function appendText(parent, tagName, className, text) {
    if (!text) {
      return null;
    }

    var element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function normalUrl(href) {
    if (!href) {
      return '';
    }

    try {
      var url = new URL(href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function appendLink(parent, href) {
    var url = normalUrl(href);
    if (!url) {
      return;
    }

    var link = document.createElement('a');
    link.className = 'job-listing-link';
    link.href = url;
    link.textContent = 'Job advert';
    link.rel = 'noopener';
    link.target = '_blank';
    parent.appendChild(link);
  }

  function searchableText(entry) {
    return [
      entry[headers.title],
      entry[headers.institution],
      entry[headers.location],
      entry[headers.description],
      entry[headers.contact]
    ].join(' ').toLowerCase();
  }

  function matchingEntries(entries) {
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (!query) {
      return entries;
    }

    return entries.filter(function (entry) {
      return searchableText(entry).indexOf(query) !== -1;
    });
  }

  function render(entries, emptyMessage) {
    root.innerHTML = '';

    if (!entries.length) {
      renderEmpty(emptyMessage);
      return;
    }

    entries.forEach(function (entry) {
      var article = document.createElement('article');
      article.className = 'job-listing';

      appendText(article, 'h2', 'job-listing-title', entry[headers.title]);
      appendText(article, 'p', 'job-listing-meta', [entry[headers.institution], entry[headers.location]].filter(Boolean).join(' - '));
      appendText(article, 'p', 'job-listing-description', entry[headers.description]);
      appendText(article, 'p', 'job-listing-deadline', 'Deadline: ' + entry[headers.deadline]);

      var actions = document.createElement('p');
      actions.className = 'job-listing-actions';
      appendLink(actions, entry[headers.url]);
      appendText(actions, 'span', 'job-listing-contact', entry[headers.contact]);
      article.appendChild(actions);

      root.appendChild(article);
    });
  }

  fetch(sheetUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('The job adverts could not be loaded.');
      }
      return response.text();
    })
    .then(function (csv) {
      var entries = rowObjects(parseCsv(csv));
      if (!hasRequiredColumns(entries)) {
        renderEmpty('No job adverts are currently listed.');
        return;
      }
      var currentEntries = entries.filter(function (entry) {
        return isApproved(entry) && isCurrent(entry);
      });
      var update = function () {
        var emptyMessage = currentEntries.length ? 'No job adverts match your search.' : 'No job adverts are currently listed.';
        render(matchingEntries(currentEntries), emptyMessage);
      };
      if (searchInput) {
        searchInput.addEventListener('input', update);
      }
      update();
    })
    .catch(function () {
      renderEmpty('No job adverts are currently listed.');
    });
}());
