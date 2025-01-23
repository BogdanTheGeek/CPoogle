# CPoogle
Google for Origami CPs.

Uses google drive api and nltk to index, and clasify models.

Serves the data as a static webpage and uses [Fuse.js](https://www.fusejs.io/) to fuzzy find models

## Developer notes
### Scan CPs
Use `scan.py` to retrieve all the files. You will need a `credentials.json` with your google cloud OAuth keys, follow a tutorial or smth.

### Organise
Use `organise.py` with the output of `scan.py` to generate a "database" of models. This will also use `nltk` to add metadata.
