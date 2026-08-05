# -----------------------------------------------------------------------------
# fzf shell integration
# -----------------------------------------------------------------------------
if command -v fzf >/dev/null 2>&1; then
  unset FZF_CTRL_R_COMMAND 2>/dev/null || true
  source <(fzf --zsh)

  if whence -w fzf-history-widget >/dev/null 2>&1; then
    bindkey '^R' fzf-history-widget 2>/dev/null || true
    bindkey '^[r' fzf-history-widget 2>/dev/null || bindkey 'M-r' fzf-history-widget 2>/dev/null || true
  fi
fi

# fzf defaults
if command -v fd >/dev/null 2>&1; then
  export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'
elif command -v fdfind >/dev/null 2>&1; then
  export FZF_DEFAULT_COMMAND='fdfind --type f --hidden --follow --exclude .git'
elif command -v rg >/dev/null 2>&1; then
  export FZF_DEFAULT_COMMAND='rg --files --hidden --follow --glob "!.git/*"'
fi

if command -v bat >/dev/null 2>&1; then
  export FZF_PREVIEW_COMMAND='bat --style=numbers --color=always {}'
else
  export FZF_PREVIEW_COMMAND='sed -n "1,200p" {} 2>/dev/null'
fi

[[ -n "${FZF_DEFAULT_COMMAND:-}" ]] && export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
export FZF_DEFAULT_OPTS="${FZF_DEFAULT_OPTS:-} --height=40% --layout=reverse --ansi --preview='$FZF_PREVIEW_COMMAND' --bind='ctrl-z:ignore'"
