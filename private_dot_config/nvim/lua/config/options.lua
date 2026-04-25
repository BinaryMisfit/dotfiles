local o = vim.opt

o.number = true
o.relativenumber = true
o.signcolumn = "yes"

o.expandtab = true
o.shiftwidth = 2
o.tabstop = 2
o.smartindent = true

o.ignorecase = true
o.smartcase = true

o.splitright = true
o.splitbelow = true

o.scrolloff = 8
o.wrap = false

o.undofile = true
o.swapfile = false
o.backup = false

o.termguicolors = true
o.clipboard = "unnamedplus" -- will fallback gracefully over SSH

vim.opt.termguicolors = true
