#!/usr/bin/env bash
./wait-for-it.sh -t 0 redis:6379
node /app/dist/main.js
