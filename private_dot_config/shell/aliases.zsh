alias vi='nvim'
alias vim='nvim'
alias svi='sudoedit'
alias svim='sudoedit'
alias t="tmux new -As main"

if command -v eza >/dev/null 2>&1; then
  alias ls='eza'
  alias ll='eza -lh --git --icons=auto'
  alias la='eza -lah --git --icons=auto'
  alias lt='eza --tree --level=2 --icons=auto'
fi
