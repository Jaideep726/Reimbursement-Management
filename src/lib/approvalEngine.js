import { supabase } from './supabase'
import { convertCurrency } from './currency'

export const submitExpense = async (
  { amount, currency, category, description, date, ruleId, receiptFile },
  userId,
  companyId
) => {
  // Step 1: Get company currency
  const { data: company, error: compErr } = await supabase
    .from('companies')
    .select('currency_code')
    .eq('id', companyId)
    .single()
  if (compErr) throw compErr

  const companyCurrency = company.currency_code
  const convertedAmount = await convertCurrency(amount, currency, companyCurrency)

  // Step 2: Upload receipt if provided
  let receiptUrl = null
  if (receiptFile) {
    const path = `receipts/${userId}/${Date.now()}`
    const { error: uploadErr } = await supabase.storage
      .from('receipts')
      .upload(path, receiptFile)
    if (!uploadErr) {
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(path)
      receiptUrl = urlData.publicUrl
    }
  }

  // Step 3: Insert expense
  const { data: expense, error: expErr } = await supabase
    .from('expenses')
    .insert({
      employee_id: userId,
      rule_id: ruleId,
      amount,
      currency,
      converted_amount: convertedAmount,
      company_currency: companyCurrency,
      category,
      description,
      date,
      receipt_url: receiptUrl,
      status: 'pending',
      current_step: 0
    })
    .select()
    .single()
  if (expErr) throw expErr

  // Step 4: Start approval chain
  await initApprovalChain(expense.id, ruleId, userId)

  return expense
}

export const initApprovalChain = async (expenseId, ruleId, employeeId) => {
  // Fetch rule + its approvers
  const { data: rule, error: ruleErr } = await supabase
    .from('approval_rules')
    .select('*, rule_approvers(*, users(*))')
    .eq('id', ruleId)
    .single()
  if (ruleErr) throw ruleErr

  // Sort approvers by step_order
  let approvers = [...rule.rule_approvers].sort((a, b) => a.step_order - b.step_order)

  // If manager-first flag is on, inject employee's manager as step 0
  if (rule.is_manager_approver) {
    const { data: employee } = await supabase
      .from('users')
      .select('manager_id')
      .eq('id', employeeId)
      .single()

    if (employee?.manager_id) {
      approvers.unshift({
        approver_id: employee.manager_id,
        step_order: -1
      })
    }
  }

  if (rule.sequential) {
    // Sequential: only create action for first approver
    await supabase.from('approval_actions').insert({
      expense_id: expenseId,
      approver_id: approvers[0].approver_id,
      step_order: 0,
      status: 'pending'
    })
  } else {
    // Non-sequential: create actions for ALL approvers at once
    const rows = approvers.map((a, i) => ({
      expense_id: expenseId,
      approver_id: a.approver_id,
      step_order: i,
      status: 'pending'
    }))
    await supabase.from('approval_actions').insert(rows)
  }
}