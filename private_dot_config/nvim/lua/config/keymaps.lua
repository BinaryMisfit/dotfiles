local map = vim.keymap.set
local opts = { noremap = true, silent = true }

vim.g.mapleader = " "

-- basic
map("n", "<leader>w", "<cmd>w<cr>", opts)
map("n", "<leader>q", "<cmd>q<cr>", opts)

-- window navigation
map("n", "<C-h>", "<C-w>h", opts)
map("n", "<C-l>", "<C-w>l", opts)
map("n", "<C-j>", "<C-w>j", opts)
map("n", "<C-k>", "<C-w>k", opts)

-- mini.nvim
map("n", "<leader>e", function()
	require("mini.files").open()
end, opts)

map("n", "<leader>f", function()
	require("mini.pick").builtin.files()
end, opts)

map("n", "<leader>g", function()
	require("mini.pick").builtin.grep_live()
end, opts)

-- system clipboard (explicit)
map({ "n", "v" }, "<leader>y", '"+y', opts)
map("n", "<leader>Y", '"+Y', opts)

-- paste from system clipboard
map("n", "<leader>p", '"+p', opts)
map("n", "<leader>P", '"+P', opts)

-- visual paste without clobbering register
map("v", "<leader>p", '"_d"+p', opts)

-- optional: better default visual paste (preserve yank)
map("v", "p", '"_dP', opts)

-- insert mode paste from system clipboard
map("i", "<C-v>", "<C-r>+", opts)

map("v", "<leader>lf", function()
	require("conform").format({
		async = true,
		lsp_fallback = false,
		range = {
			start = vim.api.nvim_buf_get_mark(0, "<"),
			["end"] = vim.api.nvim_buf_get_mark(0, ">"),
		},
	})
end, opts)

map("n", "<leader>tf", function()
	vim.g.format_on_save_enabled = not vim.g.format_on_save_enabled
	vim.notify("Format on save: " .. (vim.g.format_on_save_enabled and "ON" or "OFF"))
end, opts)

-- lua/config/keymaps.lua

map("n", "<leader>ll", function()
	require("lint").try_lint()
end, opts)

-- lua/plugins/lsp.lua (or keymaps if you prefer central)

map("n", "K", vim.lsp.buf.hover, opts)
map("n", "<leader>rn", vim.lsp.buf.rename, opts)
map("n", "gd", vim.lsp.buf.definition, opts)
map("n", "gr", vim.lsp.buf.references, opts)
