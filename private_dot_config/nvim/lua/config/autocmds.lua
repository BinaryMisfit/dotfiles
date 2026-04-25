local augroup = vim.api.nvim_create_augroup("number_toggle", { clear = true })

vim.api.nvim_create_autocmd("InsertEnter", {
  group = augroup,
  callback = function()
    vim.opt.relativenumber = false
  end,
})

vim.api.nvim_create_autocmd("InsertLeave", {
  group = augroup,
  callback = function()
    vim.opt.relativenumber = true
  end,
})
