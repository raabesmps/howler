#!/usr/bin/env bash
# Prepares a fresh Debian 12 or Ubuntu LTS VM to run Howler (docs/guides/DEPLOYMENT.md, section 2). Run it once, as root:
#
#   sudo bash server-setup.sh "<the PUBLIC half of the deploy key, one line>"
#
# What it does, and nothing else:
#   - installs Docker and the Compose plugin (Docker's own apt repository)
#   - makes Docker keep at most 30 MB of logs per container
#   - creates the user `deploy` (in the docker group) and the folder /opt/howler it deploys into
#   - authorises the deploy key for that user (when you pass it)
#   - installs cron (for the daily backup) and turns on automatic security updates
#   - adds a 2 GB swap file on a machine with little memory
# It does NOT touch the firewall (that is Google Cloud's, outside the VM) and does NOT change SSH settings: do that by
# hand, once you have checked that your own key works, so a mistake here can never lock you out.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "run this as root: sudo bash $0 \"<public key>\"" >&2; exit 1; }
PUBKEY="${1:-}"

# shellcheck disable=SC1091
. /etc/os-release
case "${ID}" in
  debian|ubuntu) ;;
  *) echo "this script supports Debian and Ubuntu, not ${ID}" >&2; exit 1 ;;
esac

echo "==> packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg unattended-upgrades cron

echo "==> Docker"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "Docker and Compose are already installed: $(docker --version)"
else
  # Docker's repository has packages for each release it supports. A very new release may not be there yet.
  if curl -fsI "https://download.docker.com/linux/${ID}/dists/${VERSION_CODENAME}/Release" >/dev/null 2>&1; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  elif [ "${ID}" = "ubuntu" ]; then
    echo "Docker's repository has no packages for ${VERSION_CODENAME} yet: using Ubuntu's own."
    apt-get install -y docker.io docker-compose-v2
  else
    echo "Docker's repository has no packages for ${VERSION_CODENAME}, and Debian's own lack the Compose plugin." >&2
    echo "Use Debian 12 (bookworm) or an Ubuntu LTS for this VM." >&2
    exit 1
  fi
fi
systemctl enable --now docker

echo "==> Docker logs: at most 3 files of 10 MB per container"
if [ -f /etc/docker/daemon.json ]; then
  echo "/etc/docker/daemon.json already exists: left alone. Make sure it limits the log size (see the runbook)."
else
  cat > /etc/docker/daemon.json <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
  systemctl restart docker
fi

echo "==> the deploy user and its folder"
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -o deploy -g deploy -m 755 /opt/howler
if [ -n "${PUBKEY}" ]; then
  install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
  touch /home/deploy/.ssh/authorized_keys
  grep -qxF "${PUBKEY}" /home/deploy/.ssh/authorized_keys || echo "${PUBKEY}" >> /home/deploy/.ssh/authorized_keys
  chown deploy:deploy /home/deploy/.ssh/authorized_keys
  chmod 600 /home/deploy/.ssh/authorized_keys
  echo "the deploy key is authorised for the user deploy"
else
  echo "no public key given: add the deploy key to /home/deploy/.ssh/authorized_keys yourself"
fi

echo "==> automatic security updates"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF

echo "==> swap"
mem_mb="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
if [ "${mem_mb}" -lt 3000 ] && [ -z "$(swapon --show --noheadings)" ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "2 GB swap file created"
else
  echo "enough memory or swap already present: nothing to do"
fi

echo
echo "done. Next (see docs/guides/DEPLOYMENT.md):"
echo "  - copy deploy/env.production.example to /opt/howler/.env as the user deploy and fill it in (chmod 600)"
echo "  - check that you can log in as deploy with the deploy key, THEN consider disabling SSH passwords and root login"
