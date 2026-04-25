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

vim.opt.termguicolors = true
vim.g.loaded_node_provider = 0
vim.g.loaded_perl_provider = 0
vim.g.loaded_python3_provider = 0
vim.g.loaded_ruby_provider = 0

if vim.g.format_on_save_enabled == nil then
	vim.g.format_on_save_enabled = true
end

vim.diagnostic.config({
	virtual_text = false,
	signs = true,
	underline = true,
	update_in_insert = false,
	severity_sort = true,
})
