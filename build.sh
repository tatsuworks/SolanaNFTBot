#!/bin/bash
yarn
source secrets.sh

set -euo pipefail
cd "$(dirname "$0")"

VERSION="$(git describe --dirty --always)"
if [[ $VERSION == *-dirty ]]; then
  # We need to ensure the image is loaded again so we give the image a unique
  # name from other images based on this dirty commit.
  VERSION+="-$(head -c 5 < /dev/urandom | base32)"
fi

uri="$CONTAINER_REGISTRY/tatsu/nftbot:$VERSION"
# This won't work unless you've obtained docker login from thy.
DOCKER_BUILDKIT=1 docker build \
	--ssh default \
	-t "$uri" .
docker push "$uri"

echo "Pushed new image to: $uri"
