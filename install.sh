#!/usr/bin/env bash
# Icefall Installation Script
# Usage: curl -fsSL https://icefall.dev/install.sh | bash
#
# Uninstall:
#   systemctl stop icefall && systemctl disable icefall
#   rm /usr/local/bin/icefall /etc/systemd/system/icefall.service
#   rm -rf /etc/icefall /var/lib/icefall

set -euo pipefail

ICEFALL_VERSION="${ICEFALL_VERSION:-latest}"
ICEFALL_BIN="/usr/local/bin/icefall"
ICEFALL_DATA="/var/lib/icefall"
ICEFALL_CONFIG="/etc/icefall/config.toml"
ICEFALL_SERVICE="/etc/systemd/system/icefall.service"
NONINTERACTIVE="${1:-}"

info()  { echo -e "\033[1;34m[icefall]\033[0m $*"; }
warn()  { echo -e "\033[1;33m[warn]\033[0m $*"; }
error() { echo -e "\033[1;31m[error]\033[0m $*"; exit 1; }
ok()    { echo -e "\033[1;32m[ok]\033[0m $*"; }

confirm() {
    if [ "$NONINTERACTIVE" = "--yes" ]; then return 0; fi
    read -rp "$1 [y/N] " response
    [[ "$response" =~ ^[Yy]$ ]]
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="$ID"
        OS_VERSION="$VERSION_ID"
    else
        error "Cannot detect OS. /etc/os-release not found."
    fi
}

detect_arch() {
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)  ARCH="x86_64" ;;
        aarch64) ARCH="aarch64" ;;
        arm64)   ARCH="aarch64" ;;
        *) error "Unsupported architecture: $ARCH" ;;
    esac
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root (use sudo)"
    fi
}

check_prereqs() {
    info "Checking prerequisites..."

    if ! command -v curl &>/dev/null && ! command -v wget &>/dev/null; then
        error "curl or wget is required"
    fi
    ok "curl/wget available"

    if ! command -v systemctl &>/dev/null; then
        error "systemd is required"
    fi
    ok "systemd available"

    if ! command -v docker &>/dev/null; then
        warn "Docker is not installed"
        if confirm "Install Docker via official script?"; then
            info "Installing Docker..."
            curl -fsSL https://get.docker.com | sh
            systemctl enable docker
            systemctl start docker
            ok "Docker installed"
        else
            error "Docker is required for Icefall"
        fi
    else
        ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
    fi
}

install_caddy() {
    if command -v caddy &>/dev/null; then
        ok "Caddy $(caddy version | head -1)"
        return
    fi

    info "Installing Caddy..."
    case "$OS_ID" in
        ubuntu|debian)
            apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
            curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
            curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
            apt-get update
            apt-get install -y caddy
            ;;
        fedora|centos|rhel|rocky|alma)
            dnf install -y 'dnf-command(copr)'
            dnf copr enable -y @caddy/caddy
            dnf install -y caddy
            ;;
        arch|manjaro)
            pacman -Sy --noconfirm caddy
            ;;
        *)
            warn "Cannot auto-install Caddy for $OS_ID. Install manually: https://caddyserver.com/docs/install"
            return
            ;;
    esac

    systemctl enable caddy
    systemctl start caddy
    ok "Caddy installed"
}

install_icefall() {
    info "Installing Icefall ($ARCH)..."

    local download_url
    if [ "$ICEFALL_VERSION" = "latest" ]; then
        download_url="https://github.com/nickbevers/icefall/releases/latest/download/icefall-${ARCH}-unknown-linux-gnu"
    else
        download_url="https://github.com/nickbevers/icefall/releases/download/${ICEFALL_VERSION}/icefall-${ARCH}-unknown-linux-gnu"
    fi

    if command -v curl &>/dev/null; then
        curl -fsSL "$download_url" -o "$ICEFALL_BIN"
    else
        wget -qO "$ICEFALL_BIN" "$download_url"
    fi

    chmod +x "$ICEFALL_BIN"
    ok "Binary installed to $ICEFALL_BIN"
}

setup_config() {
    if [ -f "$ICEFALL_CONFIG" ]; then
        ok "Config already exists at $ICEFALL_CONFIG"
        return
    fi

    info "Creating configuration..."
    mkdir -p /etc/icefall
    mkdir -p "$ICEFALL_DATA"

    local encryption_key
    encryption_key=$(openssl rand -base64 32)

    cat > "$ICEFALL_CONFIG" << EOF
listen_addr = "0.0.0.0"
listen_port = 3000
data_dir = "$ICEFALL_DATA"
sqlite_path = "$ICEFALL_DATA/icefall.db"
docker_socket = "/var/run/docker.sock"
caddy_admin_url = "http://localhost:2019"
encryption_key = "$encryption_key"
log_level = "info"
pid_file = "/var/run/icefall.pid"

# base_domain = "apps.example.com"
EOF

    ok "Config written to $ICEFALL_CONFIG"
}

setup_systemd() {
    if [ -f "$ICEFALL_SERVICE" ]; then
        ok "Service file already exists"
        systemctl daemon-reload
        return
    fi

    info "Creating systemd service..."

    cat > "$ICEFALL_SERVICE" << 'EOF'
[Unit]
Description=Icefall PaaS Daemon
After=network.target docker.service caddy.service
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/local/bin/icefall daemon start
Restart=always
RestartSec=5
Environment=ICEFALL_CONFIG=/etc/icefall/config.toml

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable icefall
    ok "Systemd service created"
}

start_services() {
    info "Starting services..."

    if ! systemctl is-active --quiet caddy; then
        systemctl start caddy
    fi
    ok "Caddy running"

    systemctl start icefall
    ok "Icefall daemon running"
}

print_success() {
    local server_ip
    server_ip=$(curl -s https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')

    echo ""
    echo "============================================"
    echo ""
    info "Icefall is installed and running!"
    echo ""
    echo "  Dashboard: http://${server_ip}:3000"
    echo "  Config:    $ICEFALL_CONFIG"
    echo "  Data:      $ICEFALL_DATA"
    echo "  Logs:      journalctl -u icefall -f"
    echo ""
    echo "  Next: Open the dashboard to create your admin account."
    echo ""
    echo "============================================"
}

main() {
    echo ""
    info "Icefall Installer"
    echo ""

    check_root
    detect_os
    detect_arch
    check_prereqs
    install_caddy
    install_icefall
    setup_config
    setup_systemd
    start_services
    print_success
}

main "$@"
