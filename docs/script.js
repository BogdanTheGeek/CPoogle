
var models = undefined;

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

/*
[
  {
    "name": "Chinchilla",
    "id": "1RmPYqU4lsvHVWXCU9UdxTCUoK8P-I-aj",
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

   // add author
   const authorCell = document.createElement('td');
   authorCell.appendChild(createLink(data.author));

   row.appendChild(nameCell);
   row.appendChild(authorCell);

   return row;
}

function getRandomModel() {
   if (models === undefined) {
      window.alert('Models are not loaded yet');
      return;
   }
   const randomIndex = Math.floor(Math.random() * models.length);
   const model = models[randomIndex];
   const link = `https://drive.google.com/drive/folders/${model.id}`;
   window.open(link, '_blank');
}

// Load the JSON data
fetch('models.json')
   .then(response => response.json())
   .then(data => {
      models = data;
      // Get the search input and results container elements
      const searchInput = document.getElementById('search-input');
      const searchResults = document.getElementById('search-results');
      const liveResults = document.getElementById('live-results');

      // Add an event listener to the search input
      searchInput.addEventListener('keyup', (event) => {
         if (event.key !== "Enter" && !liveResults.checked) {
            return;
         }
         // Get the search query
         const query = searchInput.value.toLowerCase();
         const options = {
            includeScore: true,
            threshold: 0.3,
            keys: ['name', 'tags', 'author.name']
         };

         // Filter the data based on the search query
         const fuse = new Fuse(data, options);

         const result = fuse.search(query);

         // Clear the search results container
         const tbody = searchResults.querySelector('tbody');
         tbody.innerHTML = '';

         // Update the search results container
         result.forEach(el => {
            tbody.appendChild(createRow(tbody, el.item));
         });
      });
   });

endpoint = 'https://api.counterapi.dev/v1/bogdanthegeek/cpoogle'
if (window.location.hostname !== 'localhost') {
   endpoint += '/up';
}

fetch(endpoint)
   .then(response => response.json())
   .then(data => {
      document.getElementById('counter').innerHTML = `Visits: ${data.count}`;
   })
   .catch(err => {
      console.error(err);
   });
