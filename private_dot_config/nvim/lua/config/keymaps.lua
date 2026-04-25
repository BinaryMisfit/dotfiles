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
map("n", "<leader>rn", function()
	local curr = vim.fn.expand("<cword>")
	local new = vim.fn.input("Rename → ", curr)

	if new == "" or new == curr then
		return
	end

	vim.lsp.buf.rename(new)
end, opts)
map("n", "gd", vim.lsp.buf.definition, opts)
map("n", "gr", vim.lsp.buf.references, opts)

-- diagnostics
map("n", "<leader>co", function()
	local diagnostics = vim.diagnostic.get(0)

	if #diagnostics == 0 then
		vim.notify("No diagnostics", vim.log.levels.INFO)
		return
	end

	vim.diagnostic.open_float(nil, { border = "rounded" })
end, opts)
map("n", "<leader>cq", vim.diagnostic.setloclist, opts)
map("n", "]d", function()
	vim.diagnostic.jump({ count = 1, float = true })
end, opts)

map("n", "[d", function()
	vim.diagnostic.jump({ count = -1, float = true })
end, opts)

-- symbols
map("n", "<leader>ss", function()
	vim.lsp.buf.document_symbol()
end, opts)
map("n", "<leader>sS", function()
	vim.lsp.buf.workspace_symbol()
end, opts)
map("n", "<leader>lc", "<cmd>lclose<cr>", opts)
map("n", "<leader>qc", "<cmd>cclose<cr>", opts)
map("n", "]l", "<cmd>lnext<cr>", opts)
map("n", "[l", "<cmd>lprev<cr>", opts)

map("n", "<leader>td", "<cmd>Trouble diagnostics toggle<cr>", opts)
map("n", "<leader>tb", "<cmd>Trouble diagnostics toggle filter.buf=0<cr>", opts)
map("n", "<leader>tq", "<cmd>Trouble qflist toggle<cr>", opts)
map("n", "<leader>tl", "<cmd>Trouble loclist toggle<cr>", opts)
map("n", "<leader>to", "<cmd>AerialToggle<cr>", opts)
map("n", "<leader>tn", "<cmd>AerialNavToggle<cr>", opts)

map("n", "<leader>ha", function()
	require("harpoon"):list():add()
end, opts)
map("n", "<leader>hh", function()
	local harpoon = require("harpoon")
	harpoon.ui:toggle_quick_menu(harpoon:list())
end, opts)
map("n", "<leader>h1", function()
	require("harpoon"):list():select(1)
end, opts)
map("n", "<leader>h2", function()
	require("harpoon"):list():select(2)
end, opts)
map("n", "<leader>h3", function()
	require("harpoon"):list():select(3)
end, opts)
map("n", "<leader>h4", function()
	require("harpoon"):list():select(4)
end, opts)
