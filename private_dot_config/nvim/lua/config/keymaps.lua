local map = vim.keymap.set
local opts = { noremap = true, silent = true }

vim.g.mapleader = " "

map("n", "<leader>w", "<cmd>w<cr>", opts)
map("n", "<leader>q", "<cmd>q<cr>", opts)

-- better navigation
map("n", "<C-h>", "<C-w>h", opts)
map("n", "<C-l>", "<C-w>l", opts)
map("n", "<C-j>", "<C-w>j", opts)
map("n", "<C-k>", "<C-w>k", opts)

map("n", "<leader>e", function() require("mini.files").open() end)
map("n", "<leader>f", function() require("mini.pick").builtin.files() end)
map("n", "<leader>g", function() require("mini.pick").builtin.grep_live() end)
