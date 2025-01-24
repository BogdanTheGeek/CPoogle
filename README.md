# CPoogle
Google for Origami CPs.

Try it here: https://bogdanthegeek.github.io/CPoogle/

Uses google drive api and nltk to index, and clasify models.

Serves the data as a static webpage and uses [Fuse.js](https://www.fusejs.io/) to fuzzy find models

## Developer notes
### Scan CPs
Use `scan.py` to retrieve all the files. You will need a `credentials.json` with your google cloud OAuth keys, follow a tutorial or smth.

Option `-j` sets the number of jobs, this can speed up the process a lot, but you may hit some rate limits and it uses more memory (32 works well).

### Organise
Use `organise.py` with the output of `scan.py` to generate a "database" of models. This will also use `nltk` to add metadata.
