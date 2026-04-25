require("onedarkpro").setup({
  options = {
    transparency = false,
    terminal_colors = true,
  },
})

vim.cmd("colorscheme onedark")

vim.opt.cursorline = true

vim.api.nvim_set_hl(0, "LineNr", { fg = "#5c6370" })
vim.api.nvim_set_hl(0, "CursorLineNr", { fg = "#e5c07b", bold = true })
vim.api.nvim_set_hl(0, "VertSplit", { fg = "#3e4452" })
