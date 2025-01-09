#!/bin/bash

# Check if zopflipng is installed
if ! command -v zopflipng &> /dev/null; then
	  echo "zopflipng is not installed. Install it with 'sudo apt install zopfli' or equivalent."
	    exit 1
fi

# Directory to start from (current directory if not specified)
DIR="${1:-.}"

# Recursively find and optimize PNG files
find "$DIR" -type f -name "*.png" | while read -r file; do
echo "Optimizing: $file"
zopflipng "$file" "${file}.opt"

# Check if the optimized file is smaller, then replace the original
if [ "$(stat -c%s "${file}.opt")" -lt "$(stat -c%s "$file")" ]; then
   	mv "${file}.opt" "$file"
	echo "Replaced original with optimized: $file"
else
	rm "${file}.opt"
	echo "No size improvement for: $file"
fi
done

echo "Optimization complete!"
			    
