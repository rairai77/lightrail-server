#!/bin/bash

for i in {1..5}; do
  echo "=== Request $i ==="
  curl -s http://localhost:3000/routes | jq '
    to_entries[] |
    {
      route: .value.routeName,
      nullStops: [
        .value.destinations[].stops[] |
        select(.nextArrival == null) |
        .name
      ]
    } |
    select(.nullStops | length > 0)
  '
  echo ""
  sleep 5
done
