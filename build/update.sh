#!/usr/bin/env bash

cd $(dirname "$0")
cd ..


# Get version from NPM
mkdir -p build/tmp/

NPM_JSON="build/tmp/npm-uglify-es.json"
curl https://registry.npmjs.org/uglify-es > "$NPM_JSON"

VERSION=$(jq -r '."dist-tags".latest' "$NPM_JSON")
VERSION_GIT_HEAD=$(jq -r '.versions[."dist-tags".latest].gitHead' "$NPM_JSON")

rm -r build/tmp/

echo "Latest version is $VERSION ($VERSION_GIT_HEAD)"


# Update to this version
git clean -fd

git submodule update --init

cd uglify/

PREV_VERSION=$(jq -r '.version' package.json)

if [ "$VERSION" -eq "$PREV_VERSION" ]; then
	echo "Already on version $VERSION, no update needed"
	exit 0
fi

git pull --ff-only origin "$VERSION_GIT_HEAD"

cd ..


# Run smoketest
node build/smoketest/smoketest.js

if [ $? -ne 0 ]; then
    echo "Exiting because of smoketest error"
    exit 1
fi


# Update version
sed -i 's/\(<code id="version">\)[^<]*\(<\/code>\)/\1uglify-es '"$VERSION"'\2/' index.html
sed -i 's/\(# Appcache version \).\+/\1'"$VERSION"'/' cache.appcache


# Commit and push
git add index.html
git add cache.appcache
git add uglify
git commit -m "Update to uglify-es $VERSION"
