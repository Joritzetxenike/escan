#!/usr/bin/env bash
# Verifica que el bundle del APK incluya la configuracion de Supabase.
# Uso: ./scripts/verificar-bundle-apk.sh <ruta-apk>
#
# Requiere la variable de entorno EXPO_PUBLIC_SUPABASE_URL.
# Si el bundle no incluye el host de Supabase, el APK arrancaria en
# pantalla blanca y el script sale con error.

set -euo pipefail

APK="${1:?Falta la ruta al APK}"

if [ ! -f "$APK" ]; then
  echo "::error::No se encontro el APK: $APK"
  exit 1
fi

if [ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "::error::Falta la variable de entorno EXPO_PUBLIC_SUPABASE_URL"
  exit 1
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

unzip -o -q "$APK" "assets/index.android.bundle" -d "$WORKDIR"

BUNDLE="$WORKDIR/assets/index.android.bundle"
if [ ! -f "$BUNDLE" ]; then
  echo "::error::No se encontro assets/index.android.bundle en el APK"
  exit 1
fi

HOST="${EXPO_PUBLIC_SUPABASE_URL#https://}"
HOST="${HOST%%/*}"

if [ -z "$HOST" ]; then
  HOST="supabase.co"
fi

if grep -qa "$HOST" "$BUNDLE"; then
  echo "OK: el bundle incluye la configuracion de Supabase ($HOST)"
  exit 0
else
  echo "::error::El bundle NO incluye la configuracion de Supabase ($HOST)."
  echo "::error::Este APK arrancara en pantalla blanca. Revisa eas.json"
  echo "::error::(build.*.env) o las variables EXPO_PUBLIC_SUPABASE_*."
  exit 1
fi
