vim.diagnostic.config({
  virtual_text = true,
  signs = true,
  underline = true,
  update_in_insert = false,
  severity_sort = true,
})

local map = vim.keymap.set
local capabilities = require("blink.cmp").get_lsp_capabilities()

vim.api.nvim_create_autocmd("LspAttach", {
  callback = function(event)
    local bo = { buffer = event.buf, noremap = true, silent = true }

    map("n", "gd", vim.lsp.buf.definition, bo)
    map("n", "gD", vim.lsp.buf.declaration, bo)
    map("n", "gr", vim.lsp.buf.references, bo)
    map("n", "gi", vim.lsp.buf.implementation, bo)
    map("n", "K", vim.lsp.buf.hover, bo)
    map("n", "<leader>rn", vim.lsp.buf.rename, bo)
    map("n", "<leader>ca", vim.lsp.buf.code_action, bo)
    map("n", "<leader>d", vim.diagnostic.open_float, bo)
    map("n", "[d", vim.diagnostic.goto_prev, bo)
    map("n", "]d", vim.diagnostic.goto_next, bo)
  end,
})

vim.lsp.config("lua_ls", {
  capabilities = capabilities,
  settings = {
    Lua = {
      runtime = {
        version = "LuaJIT",
      },
      diagnostics = {
        globals = { "vim" },
      },
      workspace = {
        checkThirdParty = false,
        library = {
          vim.env.VIMRUNTIME,
        },
      },
      telemetry = {
        enable = false,
      },
    },
  },
})
vim.lsp.config("bashls", {
  capabilities = capabilities
})
vim.lsp.config("jsonls", {
  capabilities = capabilities
})
vim.lsp.config("yamlls", {
  capabilities = capabilities
})

vim.lsp.enable({
  "lua_ls",
  "bashls",
  "jsonls",
  "yamlls",
})
