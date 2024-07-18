#!/bin/bash

# Start Memcached in the background
memcached -u memcache -p 11211 &

# Start the other services
node bankApi/build/index.js &
node cachedServiceQuery/dist/index.js &
node cachedServiceStorage/dist/index.js &
node calculation_Service/dist/index.js &
node getAllRates/build/index.js &
node frontend-server/server.js &

# Wait for all background processes to complete
wait
