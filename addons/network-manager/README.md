# Arch3r NVR - Armbian Dual-Interface Network Router Addon

Interactive network management Addon for Arch3r NVR running on Armbian Linux STB (Ubuntu Noble base).

## Problem Solved
ISP router interface isolation blocks LAN-to-Wi-Fi inter-camera communication. This Addon configures static host routes (`/32`) and dual-interface route metrics (`LAN=50`, `Wi-Fi=500`) using `nmcli` to ensure maximum Internet speed via Ethernet while routing Wi-Fi camera traffic cleanly without dropping packets.

## REST API Endpoints
- `GET /api/addons/network-manager/connections`: List interfaces & detect active LAN/Wi-Fi.
- `POST /api/addons/network-manager/metrics`: Set LAN metric 50 & Wi-Fi metric 500.
- `POST /api/addons/network-manager/routes`: Add static camera route (`+ipv4.routes "CAMERA_IP/32"`).
- `DELETE /api/addons/network-manager/routes`: Remove static camera route.
- `POST /api/addons/network-manager/apply`: Restart connections (`nmcli connection up`).
- `GET /api/addons/network-manager/routes/system`: Read Linux kernel routing table (`ip route show`).
