local wezterm = require("wezterm")
local config = wezterm.config_builder()

-- Generated from iTerm2 State.itermexport: Default profile
-- Keep this boring until the trial proves what actually matters.

config.term = "xterm-256color"

config.font = wezterm.font_with_fallback({
  "MesloLGS Nerd Font Mono",
  "Symbols Nerd Font Mono",
  "Noto Color Emoji",
})
config.font_size = 14.0

config.line_height = 1.0
config.cell_width = 1.0

config.scrollback_lines = 100000

config.window_background_opacity = 1.0
config.macos_window_background_blur = 0
config.window_padding = {
  left = 6,
  right = 6,
  top = 4,
  bottom = 2,
}

config.color_scheme = "Atom"

config.default_cursor_style = "SteadyBlock"
config.cursor_blink_rate = 0
config.audible_bell = "Disabled"

config.enable_tab_bar = true
config.hide_tab_bar_if_only_one_tab = true
config.use_fancy_tab_bar = false
config.tab_bar_at_bottom = false

config.send_composed_key_when_left_alt_is_pressed = false
config.send_composed_key_when_right_alt_is_pressed = true

config.native_macos_fullscreen_mode = true
config.adjust_window_size_when_changing_font_size = false
config.check_for_updates = false
config.window_close_confirmation = "AlwaysPrompt"

return config
