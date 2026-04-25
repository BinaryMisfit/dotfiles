local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"

if not vim.loop.fs_stat(lazypath) then
	vim.fn.system({
		"git",
		"clone",
		"--filter=blob:none",
		"https://github.com/folke/lazy.nvim.git",
		lazypath,
	})
end

vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
	{
		"nvim-mini/mini.nvim",
		version = "*",
		config = function()
			require("plugins.mini")
		end,
	},

	{
		"nvim-treesitter/nvim-treesitter",
		build = ":TSUpdate",
		config = function()
			require("plugins.treesitter")
		end,
	},

	{
		"olimorris/onedarkpro.nvim",
		config = function()
			require("config.theme")
		end,
	},

	{
		"folke/trouble.nvim",
		cmd = "Trouble",
		opts = {},
	},

	{
		"neovim/nvim-lspconfig",
		config = function()
			require("plugins.lsp")
		end,
	},

	{
		"saghen/blink.cmp",
		version = "*",
		dependencies = {
			"rafamadriz/friendly-snippets",
		},

		config = function()
			require("plugins.completion")
		end,
	},

	{
		"stevearc/conform.nvim",
		event = { "BufWritePre", "BufNewFile" },
		config = function()
			require("plugins.formatting")
		end,
	},

	{
		"mfussenegger/nvim-lint",
		event = { "BufReadPre", "BufNewFile" },
		config = function()
			local lint = require("lint")

			lint.linters_by_ft = {
				sh = { "shellcheck" },
				bash = { "shellcheck" },
				javascript = { "eslint_d" },
				typescript = { "eslint_d" },
			}

			-- trigger linting
			local lint_augroup = vim.api.nvim_create_augroup("lint", { clear = true })

			vim.api.nvim_create_autocmd({ "BufWritePost", "InsertLeave" }, {
				group = lint_augroup,
				callback = function()
					lint.try_lint()
				end,
			})
		end,
	},
}, {
	rocks = {
		enabled = false,
	},
})
