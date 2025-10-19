
var models = undefined;
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const liveResults = document.getElementById('live-results');
const encoder = new TextEncoder();
const filters = {};
//keeps track of which, if any, filter is open
var openFilter = ""; 
//the filters the website will use
const filtersToUse = ["design_style", "paper_shape"];
const currentResultsFilters = {};
filtersToUse.forEach((filter) => currentResultsFilters[filter] = []);

const defaultOptions = {
   includeScore: true,
   threshold: 0.3,
   keys: ['name', 'tags', 'author.name'].concat(filtersToUse),
   useExtendedSearch: true
};

function createLink(model) {
   link = document.createElement('a');
   prefix = 'file/d';
   if (model.type == undefined || model.type === 'application/vnd.google-apps.folder') {
      prefix = 'drive/folders';
   }
   link.href = `https://drive.google.com/${prefix}/${model.id}`;
   link.textContent = model.name;
   link.target = '_blank';
   return link;
}

function createText(textContent) {
   text = document.createElement('p');
   text.textContent = textContent.join(", ");
   return text;
}

function createThumbnail(id) {
   href = `https://drive.google.com/thumbnail?id=${id}&sz=h200`;
   img = document.createElement('img');
   img.src = href;
   return img
}

/*
[
  {
    "name": "Chinchilla",
    "id": "1RmPYqU4lsvHVWXCU9UdxTCUoK8P-I-aj",
    "design_style":["22.5\u00b0"],
    "paper_shape":["Square"],
    "type": "application/vnd.google-apps.folder",
    "files": [
      {
        "mimeType": "image/jpeg",
        "id": "10h3aIXEC1Snn64In6TKngQBIh3o37sle",
        "name": "20608458740_b6c73a180a_b.jpg"
      },
      {
        "mimeType": "image/jpeg",
        "id": "1LsSsg6pzsvvK4pkdq7nl1MdwLohEDptE",
        "name": "43930375164_398796ff45_b.jpg"
      }
    ],
    "author": {
      "name": "David Llanque",
      "id": "1u7cptYSRtwyD0r886v1PaBMn4pxKPYc3"
    },
    "tags": [
      "chinchilla",
      "fur",
      "animal_skin",
      "animal_product",
      "animal_material",
      "material"
    ],
    "has_pd": false
  }

]
*/
function createRow(table, data) {
   // Create a row for the name
   const row = document.createElement('tr');
   table.appendChild(row);

   // add name
   const nameCell = document.createElement('td');
   nameCell.appendChild(createLink(data));
   row.appendChild(nameCell);

   // add author
   const authorCell = document.createElement('td');
   authorCell.appendChild(createLink(data.author));
   row.appendChild(authorCell);
   
   filtersToUse.forEach((filterType) => {
      const filterCell = document.createElement('td');
      filterCell.appendChild(createText(data[filterType]));
      row.appendChild(filterCell);
   });

   // Create a row for the previews
   const previewsRow = document.createElement('tr');
   previewsRow.id = data.id + "_previews";
   previewsRow.style.display = 'none';
   const previewsCell = document.createElement('td');
   previewsCell.colSpan = 3 + filtersToUse.length;
   previewsRow.appendChild(previewsCell);

   // add expand button
   const expandCell = document.createElement('td');
   const expandButton = document.createElement('button');
   expandButton.classList.add("expand-button")
   expandButton.textContent = 'Expand';
   expandButton.onclick = function() {
      if (previewsCell.innerHTML === '') {
         files = data.files.length > 0 ? data.files : [{ id: data.id }];
         files.forEach(file => {
            img = createThumbnail(file.id);
            previewsCell.appendChild(img);
         });
         previewsRow.style.display = 'contents';
      }
      else {
         // if hidden show, if shown hide
         previewsRow.style.display = previewsRow.style.display !== 'contents' ? "contents" : "none";
      }
   };
   expandCell.appendChild(expandButton);
   row.appendChild(expandCell);

   return row, previewsRow;
}

function getRandomModel() {
   if (models === undefined) {
      window.alert('Models are not loaded yet');
      return;
   }
   const randomIndex = Math.floor(Math.random() * models.length);
   const model = models[randomIndex];
   const link = createLink(model).href;
   window.open(link, '_blank');
}

function search(query, options, filtersToApply) {
   if (models === undefined) {
      console.error("Models not loaded yet");
   }

   let newSearch = { $or: [{ name: query }, { tags: query }, { "author.name": query }] };

   if (filtersToApply != null) {
      if (query === "") { //no search query, but you can query by a filter, for example, to look at all the tilted grid models, for example
         newSearch = filtersToApply;
      } else {
         newSearch = {
            $and: [
               newSearch,
               filtersToApply
            ]
         };
      }
   } 

   let results;
   let emptySearch;

   if (query === "" && filtersToApply === null) { //If there are no filters or a search, we use the full model list to produce filter numbers but don't show any results
      results = models;
      emptySearch = true;
   } else {
      const fuse = new Fuse(models, options);
      results = fuse.search(newSearch);
      emptySearch = false;
   };

   //Count how many of each category are in the search results

   Object.keys(currentResultsFilters).forEach(filterType=>currentResultsFilters[filterType] = []);
   results.forEach(result => {
      filtersToUse.forEach(filterType => {
         const filterNames = emptySearch ? result[filterType] : result.item[filterType];

         filterNames.forEach(filterName=> {
            const matchingIndex = currentResultsFilters[filterType].findIndex((item) => item[0] === filterName);
            if (matchingIndex === -1){
               currentResultsFilters[filterType].push([filterName, 1]);
            } else {
               currentResultsFilters[filterType][matchingIndex][1] += 1;
            }
         })
      })
   })

   //Sort by amount of results per filter (smallest first)
   Object.keys(currentResultsFilters).forEach(filterType=>currentResultsFilters[filterType] = currentResultsFilters[filterType].sort((a, b) => a[1] - b[1]));

   Object.keys(currentResultsFilters).forEach(filterType => {
      //Hide filters with no results associated 
      //Show amount of results per filter if the filter has results and isn't active

      const filterDropdownContainer = document.getElementById(`filter-dropdown-text-container-${filterType}`);
      for (individualFilter of filterDropdownContainer.children){
         const filterName = individualFilter.getAttribute("data-filter-name");
         const matchingIndex = currentResultsFilters[filterType].findIndex((item) => item[0] === filterName);
         if (matchingIndex === -1){
            individualFilter.classList.add("filter-hide");
         } else {
            individualFilter.classList.remove("filter-hide");
            if (filters[filterType][filterName] === true) {
               individualFilter.querySelector("p").textContent = filterName;
            } else {
               individualFilter.querySelector("p").textContent = `${filterName} (${currentResultsFilters[filterType][matchingIndex][1]})`;
            }
         }
      }

      //Reorder filters
      //The checked filters will be in the order they were checked
      //The unchecked filters will be sorted in most to least results

      const checkedElements = filterDropdownContainer.querySelectorAll("li:has(> input:not(:checked)");
      let previousElement = checkedElements[checkedElements.length - 1];

      for (let i=0; i<currentResultsFilters[filterType].length; i++){
         if (filters[filterType][currentResultsFilters[filterType][i][0]] === false){ //unchecked
            const currentElement = filterDropdownContainer.querySelector(`li[data-filter-name="${currentResultsFilters[filterType][i][0]}"]`);
            filterDropdownContainer.insertBefore(currentElement, previousElement);
            previousElement = currentElement;
         }
      }
   })
   
   // Clear the search results container
   const tbody = searchResults.querySelector('tbody');
   tbody.innerHTML = '';

   if (!emptySearch){
      // Update the search results container
      results.forEach(el => {
         tbody.appendChild(createRow(tbody, el.item));
      });
   }
}

function constructSearch(query = searchInput.value.toLowerCase()) {
   const options = defaultOptions;
   const url = new URL(window.location.href);

   //construct filters
   filtersToApply = [];
   Object.entries(filters).forEach(([key, value]) => {
      url.searchParams.set(key, ""); //creates or clears the search param
      //finds any filters that are enabled
      filtersPerType = Object.entries(value).filter((filterValue) => filterValue[1] === true).map((filterValue) => {
         //update url
         if (url.searchParams.get(key)) {
            url.searchParams.set(key, `${url.searchParams.get(key)},${filterValue[0]}`);
         } else {
            url.searchParams.set(key, encodeURI(filterValue[0]));
         }
         return ({ $path: key, $val: `="${filterValue[0]}"` }); //exact match the filters
      });
      //deletes the parameter if we didn't assign anything
      if (url.searchParams.get(key) === "") {
         url.searchParams.delete(key);
      }

      if (filtersPerType.length > 0) {
         filtersToApply.push(({
            $and: filtersPerType
         }));
      }
   })

   switch (filtersToApply.length) {
      case 0:
         //so the search function will know there are no parameters
         filtersToApply = null;
         break;
      case 1:
         //we don't need the surronding array if there is only one filter type active
         filtersToApply = filtersToApply[0];
         break;
      default:
         //if there are more than 1 type of filter active, then we need to use and
         //so results don't show up that satisfy one type but not another
         filtersToApply = ({
            $and: filtersToApply
         });
   }

   search(query, options, filtersToApply);

   // Update the URL
   url.searchParams.set('q', query);
   window.history.pushState({}, '', url);
}

function switchCheckbox(element) {
   const checkboxElement = element.querySelector("input");
   const filterType = element.getAttribute("data-filter-type");
   const filterName = element.getAttribute("data-filter-name");

   if (checkboxElement.checked === false) { //checks checkbox
      checkboxElement.checked = true;
      filters[filterType][filterName] = true;

      //Toggles the filter button & icon to active if it isn't already
      const filterButton = document.getElementById(filterType + "-button");

      if (filterButton.classList.contains("filter-button-active") === false) {
         document.getElementById(filterType + "-icon").classList.add("filter-icon-active");
         filterButton.classList.add("filter-button-active");
      }

   } else { //unchecks checkbox
      checkboxElement.checked = false;
      filters[filterType][filterName] = false;

      //toggles off the filter button if no filters are active and the menu is closed
      if (Object.values(filters[filterType]).includes(true) === false && openFilter != filterType) {
         document.getElementById(filterType + "-button").classList.remove("filter-button-active");
         document.getElementById(filterType + "-icon").classList.remove("filter-icon-active");
      }
   }

   //the browser only updates the screen when call stack is empty, 
   //so this tells js to run constructSearch() after everything (checkbox changes) are done
   //so the graphical feedback happens before the longer constructSearch call  
   setTimeout(() => {
      constructSearch();
   }, 0);
}

//these toggle functions are for touchscreen devices where hovering doesn't work
function toggleFilterDropdownOn(key) {
   document.getElementById(`${key}-button`).classList.add("filter-button-active");
   document.getElementById(`${key}-icon`).classList.add("filter-icon-active");
   document.getElementById(`${key}-filter-dropdown`).classList.add("filter-dropdown-active");
}

function toggleFilterDropdownOff(key) {
   if (Object.values(filters[key]).includes(true) === false) { //the button & icon should still look active if a filter in that type is on
      document.getElementById(`${key}-button`).classList.remove("filter-button-active");
      document.getElementById(`${key}-icon`).classList.remove("filter-icon-active");
   }
   document.getElementById(`${key}-filter-dropdown`).classList.remove("filter-dropdown-active");
}

//For closing a filter by touching somewhere else on the screen
document.addEventListener("touchstart", (e) => {
   if (openFilter !== "" && document.getElementById(`${openFilter}-filter-dropdown`).contains(e.target) === false) {
      toggleFilterDropdownOff(openFilter);
      openFilter = "";
   }
})

function createFilters(data, key) {
   //adds html for the column, so that new filter columns can easily be generated
   const keyWithSpaces = key.replace("_", " ");
   const newHtml = `
   <th class="fixed-column">
      <div class="filter-container">
            ${keyWithSpaces}
         <div class="filter-hover">
         <button class="filter-button" id="${key}-button" title="Filter by ${keyWithSpaces}">
            <svg class="filter-icon" id="${key}-icon" xmlns="http://www.w3.org/2000/svg"
               viewBox="0 0 640 640"><!--!Font Awesome Free 7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
               <path
                  d="M96 128C83.1 128 71.4 135.8 66.4 147.8C61.4 159.8 64.2 173.5 73.4 182.6L256 365.3L256 480C256 488.5 259.4 496.6 265.4 502.6L329.4 566.6C338.6 575.8 352.3 578.5 364.3 573.5C376.3 568.5 384 556.9 384 544L384 365.3L566.6 182.7C575.8 173.5 578.5 159.8 573.5 147.8C568.5 135.8 556.9 128 544 128L96 128z" />
            </svg>
         </button>
         <div class="filter-dropdown" id="${key}-filter-dropdown">
            <div class="filter-spacer"></div>
               <ul id="filter-dropdown-text-container-${key}" class="filter-dropdown-text-container">
               </ul>
            </div>
         </div>
      </div>
      </div>
   </th>`;
   document.querySelector("#details-column").insertAdjacentHTML("beforebegin", newHtml);

   //To handle taps on mobile, since hovering like desktop doesn't work
   document.getElementById(`${key}-button`).addEventListener("touchstart", (e) => {
      e.stopPropagation()
      switch (openFilter) {
         case "": //no filters open
            toggleFilterDropdownOn(key);
            openFilter = key;
            break;
         case key: //this filter is open
            toggleFilterDropdownOff(key);
            openFilter = "";
            break;
         default: //other filter open
            toggleFilterDropdownOff(openFilter);
            toggleFilterDropdownOn(key);
            openFilter = key;
      }
   })

   //find all unique values for a key
   let filterValues = [];
   data.forEach(item => {
      if (item[key] !== undefined) {
         item[key].forEach(value => {
            if (filterValues.includes(value) === false) {
               filterValues.push(value);
            }
         });
      } else {
         console.log(`Key ${key} not found in: `, item);
      }
   });

   const filterDropdownContainer = document.getElementById(`filter-dropdown-text-container-${key}`);

   //checks if any filters are active via url parameters
   filters[key] = {};
   const url = new URL(window.location.href);
   const searchParams = url.searchParams;
   const urlQuery = searchParams.get(key);
   let urlQueryValues = [];
   if (urlQuery !== null) {
      urlQueryValues = decodeURI(urlQuery).split(",");
      //make the filter button light up if there are filters active
      document.getElementById(`${key}-button`).classList.add("filter-button-active");
      document.getElementById(`${key}-icon`).classList.add("filter-icon-active");
   }

   filterValues.forEach(filterValue => {
      filters[key][filterValue] = urlQueryValues.includes(filterValue);

      const filterHtml = `
      <li class="filter-dropdown-individual-text-container" onclick="switchCheckbox(this)" data-filter-name="${filterValue}" data-filter-type="${key}">
         <input class="filter-checkbox" type="checkbox" ${filters[key][filterValue] && "checked"} onclick="switchCheckbox(this.parentElement)">
         <p class="filter-dropdown-individual-text" data-filter-name="${filterValue}">
            ${filterValue}
         </p>
      </li>
      `;

      filterDropdownContainer.insertAdjacentHTML("beforeend", filterHtml);
   })

}


// Load the JSON data
fetch('models.json')
   .then(response => response.json())
   .then(data => {
      models = data;

      filtersToUse.forEach((filterType) => {
         createFilters(data, filterType);
      });

      // Check URL (Eg. ?q=chinchilla)
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;
      const urlQuery = searchParams.get('q');

      if (urlQuery !== null) {
         searchInput.value = urlQuery;
         constructSearch(urlQuery);
      } else {
         constructSearch("");
      }

      // Add an event listener to the search input
      searchInput.addEventListener('keyup', (event) => {
         if (event.key !== "Enter" && !liveResults.checked) {
            return;
         }

         constructSearch();
      });

   });

/******************************** UI Code ************************************/

preffersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
colorSchemeToggle = document.getElementById("color-scheme-toggle");

colorSchemeToggle.checked = preffersDark;
colorSchemeToggle.addEventListener("click", function() {
   const body = document.body;

   if (body.style.colorScheme === '') {
      body.style.colorScheme = preffersDark ? 'light' : 'dark';
   } else {
      body.style.colorScheme = body.style.colorScheme === 'dark' ? 'light' : 'dark';
   }
});
