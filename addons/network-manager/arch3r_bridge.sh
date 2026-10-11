#!/usr/bin/env bash
# ==============================================================================
# arch3rBridge — Transparent Proxy-ARP & Policy-Based Routing (PBR / Solusi B)
# Platform: Linux Armbian (STB S905x/AML Box)
# Description:
#   Menembus isolasi router ISP (AP Isolation / Port Isolation) pada STB Armbian
#   dengan dua antarmuka pada subnet yang sama (eth0 & wlan0: 192.168.1.0/24).
#   Menggunakan Policy-Based Routing (PBR / ip rule) sehingga SETIAP paket yang
#   masuk ke IP Wi-Fi STB otomatis dibalas melalui wlan0, dan paket LAN dibalas
#   melalui eth0 tanpa perlu menambahkan rute manual per IP klien.
# ==============================================================================

set -e

LAN_IF="eth0"
WIFI_IF="wlan0"
TABLE_WIFI=100
TABLE_LAN=101

# Pastikan script dieksekusi dengan hak akses root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Skrip ini wajib dijalankan sebagai root (gunakan sudo)."
  exit 1
fi

get_ip() {
  local iface="$1"
  ip -4 -o addr show dev "$iface" 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -n1
}

get_subnet() {
  local iface="$1"
  local route_sub
  route_sub=$(ip route show dev "$iface" 2>/dev/null | grep -E 'proto (kernel|static) scope link' | awk '{print $1}' | head -n1)
  if [ -n "$route_sub" ]; then
    echo "$route_sub"
  else
    # Fallback jika tidak ditemukan rute direct
    local ip_addr
    ip_addr=$(get_ip "$iface")
    if [ -n "$ip_addr" ]; then
      echo "$(echo "$ip_addr" | cut -d. -f1-3).0/24"
    fi
  fi
}

get_gw() {
  local iface="$1"
  ip route show dev "$iface" 2>/dev/null | grep 'default via' | awk '{print $3}' | head -n1
}

enable_bridge() {
  echo "================================================================="
  echo "⚡ Mengaktifkan arch3rBridge (Proxy-ARP Relay & PBR Solusi B)..."
  echo "================================================================="

  # 1. Deteksi Interface & IP
  local lan_ip wifi_ip lan_sub wifi_sub lan_gw wifi_gw
  lan_ip=$(get_ip "$LAN_IF")
  wifi_ip=$(get_ip "$WIFI_IF")
  lan_sub=$(get_subnet "$LAN_IF")
  wifi_sub=$(get_subnet "$WIFI_IF")
  lan_gw=$(get_gw "$LAN_IF")
  wifi_gw=$(get_gw "$WIFI_IF")

  echo "📍 Status Antarmuka:"
  echo "   - LAN  ($LAN_IF)  : IP=${lan_ip:-'Belum Ada IP'} | Subnet=${lan_sub:-'N/A'} | GW=${lan_gw:-'192.168.1.1'}"
  echo "   - Wi-Fi ($WIFI_IF) : IP=${wifi_ip:-'Belum Ada IP'} | Subnet=${wifi_sub:-'N/A'} | GW=${wifi_gw:-'192.168.1.1'}"

  # 2. Kernel Tweaks (Zero-Lockout Proxy-ARP, Forwarding, Matikan rp_filter)
  echo "🔧 Menyetel parameter kernel sysctl..."
  sysctl -w net.ipv4.ip_forward=1 >/dev/null
  sysctl -w net.ipv4.conf.all.proxy_arp=1 >/dev/null
  sysctl -w "net.ipv4.conf.${LAN_IF}.proxy_arp=1" >/dev/null 2>&1 || true
  sysctl -w "net.ipv4.conf.${WIFI_IF}.proxy_arp=1" >/dev/null 2>&1 || true

  # Matikan Reverse Path Filtering agar kernel tidak membuang paket asimetris
  sysctl -w net.ipv4.conf.all.rp_filter=0 >/dev/null
  sysctl -w net.ipv4.conf.default.rp_filter=0 >/dev/null
  sysctl -w "net.ipv4.conf.${LAN_IF}.rp_filter=0" >/dev/null 2>&1 || true
  sysctl -w "net.ipv4.conf.${WIFI_IF}.rp_filter=0" >/dev/null 2>&1 || true
  sysctl -w net.ipv4.conf.all.send_redirects=0 >/dev/null
  sysctl -w net.ipv4.conf.all.accept_redirects=0 >/dev/null

  # 3. IPTables Forwarding & NAT MASQUERADE
  echo "🛡️ Memasang aturan IPTables Forwarding & NAT..."
  iptables -C FORWARD -i "$LAN_IF" -o "$WIFI_IF" -j ACCEPT 2>/dev/null || iptables -A FORWARD -i "$LAN_IF" -o "$WIFI_IF" -j ACCEPT
  iptables -C FORWARD -i "$WIFI_IF" -o "$LAN_IF" -j ACCEPT 2>/dev/null || iptables -A FORWARD -i "$WIFI_IF" -o "$LAN_IF" -j ACCEPT
  iptables -C FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
  iptables -t nat -C POSTROUTING -o "$LAN_IF" -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -o "$LAN_IF" -j MASQUERADE
  iptables -t nat -C POSTROUTING -o "$WIFI_IF" -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -o "$WIFI_IF" -j MASQUERADE

  # 4. Policy-Based Routing (PBR / Solusi B) untuk Wi-Fi
  if [ -n "$wifi_ip" ]; then
    echo "🌐 Memasang Policy-Based Routing (PBR) Wi-Fi (Tabel $TABLE_WIFI)..."
    while ip rule del lookup "$TABLE_WIFI" 2>/dev/null; do :; done
    ip route flush table "$TABLE_WIFI" 2>/dev/null || true
    ip rule add from "$wifi_ip" lookup "$TABLE_WIFI" priority 1000

    if [ -n "$wifi_sub" ]; then
      ip route replace "$wifi_sub" dev "$WIFI_IF" proto static scope link table "$TABLE_WIFI"
    fi
    if [ -n "$wifi_gw" ]; then
      ip route replace default via "$wifi_gw" dev "$WIFI_IF" proto static table "$TABLE_WIFI"
    fi
    echo "   ✓ Aturan PBR: 'from $wifi_ip lookup $TABLE_WIFI' aktif."
  fi

  # 5. Policy-Based Routing (PBR / Solusi B) untuk LAN
  if [ -n "$lan_ip" ]; then
    echo "🌐 Memasang Policy-Based Routing (PBR) LAN (Tabel $TABLE_LAN)..."
    while ip rule del lookup "$TABLE_LAN" 2>/dev/null; do :; done
    ip route flush table "$TABLE_LAN" 2>/dev/null || true
    ip rule add from "$lan_ip" lookup "$TABLE_LAN" priority 1001

    if [ -n "$lan_sub" ]; then
      ip route replace "$lan_sub" dev "$LAN_IF" proto static scope link table "$TABLE_LAN"
    fi
    if [ -n "$lan_gw" ]; then
      ip route replace default via "$lan_gw" dev "$LAN_IF" proto static table "$TABLE_LAN"
    fi
    echo "   ✓ Aturan PBR: 'from $lan_ip lookup $TABLE_LAN' aktif."
  fi

  echo "================================================================="
  echo "✅ arch3rBridge BERHASIL DIAKTIFKAN!"
  echo "👉 Seluruh klien di jaringan (192.168.1.0/24) kini dapat mengakses STB"
  echo "   via Wi-Fi ($wifi_ip) atau LAN ($lan_ip) secara langsung tanpa terhalang isolasi router."
  echo "================================================================="
}

disable_bridge() {
  echo "================================================================="
  echo "🛑 Menonaktifkan arch3rBridge..."
  echo "================================================================="

  # 1. Bersihkan IPTables
  echo "🧹 Menghapus aturan IPTables..."
  iptables -D FORWARD -i "$LAN_IF" -o "$WIFI_IF" -j ACCEPT 2>/dev/null || true
  iptables -D FORWARD -i "$WIFI_IF" -o "$LAN_IF" -j ACCEPT 2>/dev/null || true
  iptables -t nat -D POSTROUTING -o "$LAN_IF" -j MASQUERADE 2>/dev/null || true
  iptables -t nat -D POSTROUTING -o "$WIFI_IF" -j MASQUERADE 2>/dev/null || true

  # 2. Reset Proxy-ARP sysctl
  echo "🔧 Mengembalikan parameter sysctl..."
  sysctl -w net.ipv4.conf.all.proxy_arp=0 >/dev/null
  sysctl -w "net.ipv4.conf.${LAN_IF}.proxy_arp=0" >/dev/null 2>&1 || true
  sysctl -w "net.ipv4.conf.${WIFI_IF}.proxy_arp=0" >/dev/null 2>&1 || true

  # 3. Bersihkan Policy-Based Routing
  echo "🧹 Membersihkan tabel Policy-Based Routing (PBR)..."
  while ip rule del lookup "$TABLE_WIFI" 2>/dev/null; do :; done
  ip route flush table "$TABLE_WIFI" 2>/dev/null || true
  while ip rule del lookup "$TABLE_LAN" 2>/dev/null; do :; done
  ip route flush table "$TABLE_LAN" 2>/dev/null || true

  echo "================================================================="
  echo "🛑 arch3rBridge dinonaktifkan. Jaringan STB kembali ke mode routing standar."
  echo "================================================================="
}

status_bridge() {
  echo "================================================================="
  echo "📊 Status arch3rBridge (Proxy-ARP Relay & PBR)"
  echo "================================================================="
  local proxy_arp fwd rules
  proxy_arp=$(cat /proc/sys/net/ipv4/conf/all/proxy_arp 2>/dev/null || echo "0")
  fwd=$(cat /proc/sys/net/ipv4/ip_forward 2>/dev/null || echo "0")
  rules=$(ip rule show | grep -E "lookup ($TABLE_WIFI|$TABLE_LAN)" || true)

  echo "• Proxy-ARP All : $proxy_arp"
  echo "• IP Forwarding : $fwd"
  echo "• PBR Rules     :"
  if [ -n "$rules" ]; then
    echo "$rules" | sed 's/^/    /'
    echo "🟢 KESIMPULAN: arch3rBridge & Policy-Based Routing AKTIF!"
  else
    echo "    (Tidak ada aturan PBR aktif)"
    echo "⚪ KESIMPULAN: arch3rBridge INAKTIF"
  fi
  echo "================================================================="
}

install_service() {
  echo "📦 Memasang arch3rBridge sebagai Systemd Service (Tahan Reboot)..."
  local script_path
  script_path=$(realpath "$0")

  cat <<EOF > /etc/systemd/system/arch3r-bridge.service
[Unit]
Description=arch3rBridge Transparent Proxy-ARP & Policy-Based Routing Relay
After=network-online.target NetworkManager.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=${script_path} enable
ExecStop=${script_path} disable

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable arch3r-bridge.service
  echo "✅ Service arch3r-bridge.service berhasil dipasang & diaktifkan saat boot!"
  echo "   Gunakan: systemctl start|stop|status arch3r-bridge"
}

case "$1" in
  enable)
    enable_bridge
    ;;
  disable)
    disable_bridge
    ;;
  status)
    status_bridge
    ;;
  install-service)
    install_service
    ;;
  *)
    echo "Penggunaan: $0 {enable|disable|status|install-service}"
    exit 1
    ;;
esac
