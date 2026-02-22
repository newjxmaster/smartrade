#!/bin/bash
export DATA_DIR=/app/data
/app/backend/stockmart-backend &
nginx -g "daemon off;"
