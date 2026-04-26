require("nvim-treesitter.configs").setup({
	ensure_installed = {
		"lua",
		"vim",
		"bash",
		"json",
		"yaml",
		"toml",
		"markdown",
		"dockerfile",
	},
	highlight = {
		enable = true,
	},
})
