#!/bin/bash

# Add a fixture from the registry

set -e

pkg="$1"
shift
vers=("$@")
echo -n "getting $pkg at " >&2
if [ ${#vers[@]} -eq 0 ]; then
  echo "all versions" >&2
else
  echo "version(s) ${vers[@]}" >&2
fi

if [ "$pkg" == "" ]; then
  echo "usage: $0 <pkg> [<versions> ...]" >&2
  exit 1
fi

reg=http://registry.npmjs.org

c () {
  echo "$1 > $2" >&2
  curl -s $1 > $2
}

mkdir -p fixtures/$pkg/-
c $reg/$pkg fixtures/$pkg.json

if [ ${#vers[@]} -eq 0 ]; then
  json=$(cat fixtures/$pkg.json)
  js='console.log(Object.keys('$json'.versions).join(" "))'
  vers=($(node -e "$js"))
fi

for v in "${vers[@]}"; do
  json=$(cat fixtures/$pkg.json)
  node -p '
  JSON.stringify(JSON.parse(process.argv[1]).versions[process.argv[2]])
  ' "$json" $v > fixtures/$pkg/$v.json
  c $reg/$pkg/-/$(basename $pkg)-$v.tgz fixtures/$pkg/-/$(basename $pkg)-$v.tgz
done

# pull latest out of packument
node -p 'p = JSON.parse(process.argv[1])
JSON.stringify(p.versions[p["dist-tags"].latest])' \
  "$(cat fixtures/$pkg.json)" > fixtures/$pkg/latest.json

find fixtures/$pkg* -type f
