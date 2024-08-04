# 2FAS Server Importer

> ⚠️ **Warning**: This project is not from 2FAS. It is a community project. Use it at your own risk.

This is a tool to import data from a 2FAS server to another one.

## Installation

With your self-hosted 2FAS docker compose, you can add the following service:

```yaml
  importer:
    image: docker.ibaraki.app/mirror/twofas/2fas-importer:latest
    environment:
      - INTERVAL=60 # Interval in minutes
      - SOURCE=https://api2.2fas.com # Source server (official 2FAS server)
      - DESTINATION=http://2fas-api # Destination server (your self-hosted 2FAS server) public API
      - DESTINATION_ADMIN=http://2fas-admin-api/admin # Destination server (your self-hosted 2FAS server) admin API
```

Change the `DESTINATION` and `DESTINATION_ADMIN` to your self-hosted 2FAS server.

## Resources Imported

- Notifications (android, ios, huawei)
- Publish Notifications (android, ios, huawei) if the original server has created them 24h before the import
- Icons
- Icons Collections
- Web Services