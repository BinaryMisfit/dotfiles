if vim.loop.os_uname().sysname == "Windows_NT" then
	vim.env.CC = "clang"
end

local treesitter = require("nvim-treesitter")

treesitter.setup({
	install_dir = vim.fn.stdpath("data") .. "/site",
})

local parsers = {
	"lua",
	"vim",
	"bash",
	"json",
	"yaml",
	"toml",
	"markdown",
	"dockerfile",
}

pcall(treesitter.install, parsers)

vim.api.nvim_create_autocmd("FileType", {
	pattern = parsers,
	callback = function()
		pcall(vim.treesitter.start)
	end,
})
