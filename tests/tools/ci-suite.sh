#!/usr/bin/env bash
# Führt eine Test-Suite in GitHub Actions aus. Zusätzlich zur normalen Ausgabe werden FAIL-Zeilen als
# GitHub-Annotationen gemeldet (::error …) – die stehen im Reiter „Actions“ oben am Lauf und sind per API abrufbar,
# auch wenn man das komplette Protokoll nicht herunterladen kann. Exit-Code bleibt der der Suite (pipefail).
# Aufruf: bash tests/tools/ci-suite.sh regress
set -o pipefail
suite="$1"
node "tests/${suite}.js" 2>&1 | sed -u \
  -e "s/^FAIL: \(.*\)$/FAIL: \1\n::error title=${suite}::\1/" \
  -e "s/^Testlauf abgebrochen: \(.*\)$/Testlauf abgebrochen: \1\n::error title=${suite}::Testlauf abgebrochen: \1/" \
  -e "s/^SOME FAILED\(.*\)$/SOME FAILED\1\n::error title=${suite}::SOME FAILED\1/"
