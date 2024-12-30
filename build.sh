#!/bin/bash

rm -rf dist
npx vite build

cd dist
find . -name "*:Zone.Identifier" -type f -delete

# remove this eventually, for debugging smaller zips
rm sounds/music/*.mp3

zip -r dist.zip *
