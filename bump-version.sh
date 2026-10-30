#!/bin/sh
# One command per release: bumps the cache version in sw.js and every ?v= in index.html together.
cd "$(dirname "$0")" || exit 1
cur=$(sed -n 's/^const VERSION = \([0-9]*\);.*/\1/p' sw.js)
new=$((cur + 1))
sed -i "s/^const VERSION = $cur;/const VERSION = $new;/" sw.js
sed -i "s/?v=$cur\"/?v=$new\"/g" index.html
echo "version $cur -> $new"
