#!/bin/bash

rm -rf dist
npx vite build
cd dist
zip -r dist.zip *
