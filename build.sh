#!/bin/bash

rm -rf dist
npx vite build

cp images/ui/*.png dist/images/ui/
mkdir dist/images/ui/menu
cp images/ui/menu/*.glb dist/images/ui/menu/
cp sounds/game/*.wav dist/sounds/
mkdir dist/scc
cp scc/squarecircleco.glb dist/scc/

cd dist
zip -r dist.zip *
