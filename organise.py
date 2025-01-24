#!/usr/bin/env python3

import json
from nltk.corpus import wordnet as wn
import argparse as ap

models = {}

parser = ap.ArgumentParser()
parser.add_argument("-i", "--input", help="Input file", default="out/records.json")
parser.add_argument("-o", "--output", help="Output file", default="docs/models.json")
args = parser.parse_args()


def get_hypernyms(word, max_depth=5):
    synsets = wn.synsets(word)
    if not synsets:
        return []

    # Start with the first sense (most common meaning)
    synset = synsets[0]
    hypernyms = []

    for _ in range(max_depth):
        # Get hypernyms at the current level
        synset = synset.hypernyms()
        if not synset:
            break
        # Take the first hypernym (main branch)
        synset = synset[0]
        name = synset.lemmas()[0].name()
        hypernyms.append(name.lower())

    return hypernyms


"""
{
  "1u7cptYSRtwyD0r886v1PaBMn4pxKPYc3": {
    "name": "David Llanque",
    "designs": [
      {
        "mimeType": "application/vnd.google-apps.folder",
        "id": "1w5f8w4y9IHZalFPftSaRTaRxtAEECMM0",
        "name": "Horse 2",
        "files": [
          {
            "mimeType": "image/jpeg",
            "id": "19m6lJKpl8h3afFs7M22Tf29sR19gI_YF",
            "name": "6133008101_85df3599ed_o.jpg"
          },
          {
            "mimeType": "image/png",
            "id": "1ceSDWh8Zmy4ovQJu6CTKV4l8q70-878K",
            "name": "6133023697_1d7204564b_o.png"
          }
        ]
      },
   ]
  }
 }
 """

with open(args.input, "r") as design:
    for line in design:
        obj = json.loads(line)
        author_id = tuple(obj.keys())[0]
        author = {
            "name": obj[author_id]["name"].strip(),
            "id": author_id,
        }
        for design in obj[author_id]["designs"]:
            model = {
                "name": design["name"].strip(),
                "id": design["id"],
                "type": design["mimeType"],
                "files": design.get("files", []),
                "author": author,
            }
            models[design["id"]] = model

db = []

for id, model in models.items():
    words = model["name"].replace("(", " ").replace(")", " ").split()
    model["tags"] = []
    model["has_pd"] = False
    for word in words:
        if not word:
            continue
        word = word.strip().lower()
        if word in (
            "-",
            "–",
            "—",
            "and",
            "of",
            "the",
            "grid",
            "a",
            "an",
            "in",
            "on",
            "to",
            "for",
            "with",
            "by",
            "from",
            "at",
            "as",
            "into",
            "over",
            "under",
            "through",
            "between",
            "among",
            "within",
            "without",
            "about",
            "against",
            "behind",
            "beside",
            "during",
            "except",
            "inside",
            "near",
            "off",
            "outside",
            "since",
            "towards",
            "underneath",
            "until",
            "upon",
        ):
            continue
        if word.endswith("-") and word[:-1] in model["author"]["name"]:
            continue
        if word in model["author"]["name"]:
            continue
        if "pd" in word:
            model["has_pd"] = True
            continue
        if "pd" in word:
            continue
        if word.isnumeric():
            continue
        if word[0] == "v" and word[1:].isnumeric():
            continue

        if word.endswith(".pdf") or word.endswith(".jpg") or word.endswith(".png"):
            word = word[:-4]

        tags = [word]
        tags.extend(get_hypernyms(word))
        model["tags"].extend(tags)
    db.append(model)

print(f"Total models: {len(db)}")
with open(args.output, "w") as output:
    json.dump(db, output, separators=(",", ": "))
