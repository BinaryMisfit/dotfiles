local disabled = {
	markdown = true,
	text = true,
}

require("conform").setup({
	formatters_by_ft = {
		lua = { "stylua" },
		sh = { "shfmt" },
		bash = { "shfmt" },
	},

	format_on_save = function(bufnr)
		if not vim.g.format_on_save_enabled then
			return
		end

		if disabled[vim.bo[bufnr].filetype] then
			return
		end

		return {
			timeout_ms = 500,
			lsp_fallback = false,
		}
	end,
})
