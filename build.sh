#!/bin/bash

rm -rf dist
npx vite build

cd dist
find . -name "*:Zone.Identifier" -type f -delete

# remove this eventually, but for now remove music for debugging smaller zips
rm sounds/music/*.mp3
rm sounds/music/*.flac

zip -r dist.zip *
