#!/bin/bash
# v2.45/2.46: load desk-heir.js and desk-world.js after desk-voice.js on the six sport pages; bump the build stamp
set -e
cd /home/claude/work
OLD="$1"; NEW="$2"; LABEL="$3"
for f in cfb.html mlb.html nba.html ncaab.html nfl.html nhl.html; do
  grep -q 'desk-heir.js' $f || sed -i "s#<script src=\"desk-voice.js?v=$OLD\"></script>#<script src=\"desk-voice.js?v=$OLD\"></script>\n<script src=\"desk-heir.js?v=$OLD\"></script>\n<script src=\"desk-world.js?v=$OLD\"></script>#" $f
  sed -i "s/?v=$OLD/?v=$NEW/g" $f
  sed -i "s/BUILD v2\.[0-9][0-9]*/BUILD $LABEL/g" $f
done
sed -i "s/const PAGE_BUILD='$OLD'/const PAGE_BUILD='$NEW'/" shared.js
sed -i "s/var BUILD='$OLD'/var BUILD='$NEW'/; s/'?b='+'$OLD'/'?b='+'$NEW'/" TheDesk.html
grep -c "desk-heir.js\|desk-world.js" cfb.html mlb.html nba.html ncaab.html nfl.html nhl.html
grep -n "$NEW" shared.js TheDesk.html | head -5
