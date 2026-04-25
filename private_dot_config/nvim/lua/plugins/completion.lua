require("blink.cmp").setup({

	keymap = {
		preset = "default",

		["<C-Space>"] = { "show", "show_documentation", "hide_documentation" },
		["<CR>"] = { "accept", "fallback" },
		["<Tab>"] = { "select_next", "fallback" },
		["<S-Tab>"] = { "select_prev", "fallback" },
	},

	appearance = {
		nerd_font_variant = "mono",
		use_nvim_cmp_as_default = true,
	},

	completion = {
		trigger = {
			prefetch_on_insert = false,
			show_on_keyword = true,
		},
		list = {
			selection = {
				preselect = false,
				auto_insert = false,
			},
		},
		documentation = {
			auto_show = true,
			auto_show_delay_ms = 600,
		},
	},

	sources = {
		default = { "lsp", "path" },
		providers = {
			path = {
				max_items = 10,
			},
		},
	},
})
