---
layout: page
title: Jobs
subtitle: Job adverts from the RoSE community
js:
  - "/js/job-listings.js"
---

<p>Current job adverts shared with the RoSE community.</p>

<div class="job-listings-toolbar">
  <label class="job-listings-search-label" for="job-listings-search">Search jobs</label>
  <input id="job-listings-search"
         class="job-listings-search"
         type="search"
         placeholder="Search jobs"
         aria-label="Search jobs">
  <a class="job-listings-submit"
     href="https://forms.gle/E6R7SN3k54c7hx8Z6"
     target="_blank"
     rel="noopener">Advertise a job</a>
</div>

<div id="job-listings"
     class="job-listings"
     data-sheet-url="https://docs.google.com/spreadsheets/d/16yOVtD0XPcVht58jxOES8VYuxC-KwfY1I-D4J1TjyeU/export?format=csv&amp;gid=242872713">
  <p class="job-listings-status">Loading job adverts...</p>
</div>
