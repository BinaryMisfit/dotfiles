path_prepend() {
  [[ -d "$1" ]] || return 0
  case ":$PATH:" in
    *":$1:"*) ;;
    *) export PATH="$1:$PATH" ;;
  esac
}

clip() {
  local data b64 max_bytes=100000 seq out

  if [[ -t 0 ]]; then
    data="$*"
  else
    data="$(cat -)"
  fi

  [[ -z "${data:-}" ]] && return 1

  if [[ "${#data}" -gt "$max_bytes" ]]; then
    printf 'osc52_copy: payload too large (%d bytes, limit %d)\n' "${#data}" "$max_bytes" >&2
    return 2
  fi

  b64="$(printf '%s' "$data" | base64 | tr -d '\n')"
  seq="$(printf '\033]52;c;%s\007' "$b64")"

  # Print the data to stdout before emitting OSC52
  printf '%s\n' "$data"

  if [[ -n "${TMUX:-}" ]]; then
    out="$(printf '\033Ptmux;\033%s\033\\' "$seq")"
  else
    out="$seq"
  fi

  if [[ -w /dev/tty ]]; then
    printf '%s' "$out" > /dev/tty
  else
    printf '%s' "$out"
  fi
}
