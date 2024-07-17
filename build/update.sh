#!/usr/bin/env bash

cd $(dirname "$0")
cd ..


# Get version from NPM
mkdir -p build/tmp/

NPM_JSON="build/tmp/npm-uglify-js.json"
curl --silent --show-error https://registry.npmjs.org/uglify-js > "$NPM_JSON"

VERSION=$(jq -r '."dist-tags".latest' "$NPM_JSON")

rm -r build/tmp/

echo "Latest version is $VERSION"


# Download this version
curl -fLs "https://github.com/mishoo/UglifyJS/archive/refs/tags/v$VERSION.zip" -o uglify.zip
unzip -oq uglify.zip
dir_name=$(unzip -Z -1 uglify.zip | head -n 1)
mv "$dir_name" uglify


# Update default options
node build/update-options.js

if [ $? -ne 0 ]; then
    echo "Exiting, because updating options failed"
    exit 1
fi


# Run smoketest
node build/smoketest/smoketest.js

if [ $? -ne 0 ]; then
    echo "Exiting because of smoketest error"
    exit 1
fi


# Update version
sed -i 's/\(<code id="version">\)[^<]*\(<\/code>\)/\1uglify-js '"$VERSION"'\2/' index.html


# Publish
mkdir public
cp -r favicon.ico index.html script.js style.css uglify public
echo "Update to uglify-js $VERSION"
