#!/bin/bash
# v2.78 · minify every page script into min/ (pages load min/…). Edit the sources, then run: bash build.sh
set -e
cd "$(dirname "$0")"
T=${TERSER:-npx --yes terser@5}
mkdir -p min
for f in $(grep -ho 'src="min/[a-z0-9-]*\.js' *.html | sed 's#src="min/##' | sort -u); do
  $T "$f" -c passes=1 -m --ecma 2020 -o "min/$f"
done
ls -la min | awk 'NR>1{s+=$5}END{print "min total:",s}'
