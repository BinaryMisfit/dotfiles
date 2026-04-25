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

treesitter.install(parsers)

vim.api.nvim_create_autocmd("FileType", {
  pattern = parsers,
  callback = function()
    pcall(vim.treesitter.start)
  end,
})
