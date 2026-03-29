import { supabase } from './supabase'
import { convertCurrency } from './currency'

export const submitExpense = async (
  { amount, currency, category, description, date, ruleId, receiptFile },
  userId,
  companyId
) => {
  const { data: company } = await supabase
    .from('companies')
    .select('currency_code')
    .eq('id', companyId)
    .single()

  const companyCurrency = company.currency_code
  const convertedAmount = await convertCurrency(amount, currency, companyCurrency)

  let receiptUrl = null
  if (receiptFile) {
    const path = `receipts/${userId}/${Date.now()}`
    const { error: uploadErr } = await supabase.storage
      .from('receipts')
      .upload(path, receiptFile)
    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      receiptUrl = urlData.publicUrl
    }
  }

  const { data: expense, error } = await supabase
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
  if (error) throw error

  await initApprovalChain(expense.id, ruleId, userId)
  return expense
}

export const initApprovalChain = async (expenseId, ruleId, employeeId) => {
  const { data: rule } = await supabase
    .from('approval_rules')
    .select('*, rule_approvers(*)')
    .eq('id', ruleId)
    .single()

  let approvers = [...rule.rule_approvers].sort((a, b) => a.step_order - b.step_order)

  // Inject employee's manager as first approver if flag is on
  if (rule.is_manager_approver) {
    const { data: employee } = await supabase
      .from('users')
      .select('manager_id')
      .eq('id', employeeId)
      .single()

    if (employee?.manager_id) {
      approvers.unshift({
        approver_id: employee.manager_id,
        step_order: -1,
        is_required: false
      })
    }
  }

  if (rule.sequential) {
    // Sequential: only first approver gets it
    await supabase.from('approval_actions').insert({
      expense_id: expenseId,
      approver_id: approvers[0].approver_id,
      step_order: 0,
      status: 'pending'
    })
  } else {
    // Non-sequential: all approvers get it at once
    const rows = approvers.map((a, i) => ({
      expense_id: expenseId,
      approver_id: a.approver_id,
      step_order: i,
      status: 'pending'
    }))
    await supabase.from('approval_actions').insert(rows)
  }
}

export const processApproval = async (expenseId, approverId, action, comment) => {
  // Mark this action
  await supabase
    .from('approval_actions')
    .update({ action, comment, status: action, acted_at: new Date().toISOString() })
    .eq('expense_id', expenseId)
    .eq('approver_id', approverId)

  // Fetch expense + rule
  const { data: expense } = await supabase
    .from('expenses')
    .select('rule_id, current_step')
    .eq('id', expenseId)
    .single()

  const { data: rule } = await supabase
    .from('approval_rules')
    .select('sequential, min_approval_pct')
    .eq('id', expense.rule_id)
    .single()

  // Check if this approver is marked Required
  const { data: approverRule } = await supabase
    .from('rule_approvers')
    .select('is_required')
    .eq('rule_id', expense.rule_id)
    .eq('approver_id', approverId)
    .maybeSingle() // manager injected won't have a rule_approvers row

  const isRequired = approverRule?.is_required ?? false

  // REJECTION LOGIC
  if (action === 'rejected') {
    if (rule.sequential || isRequired) {
      // Sequential: any rejection stops the chain
      // Required approver rejected: auto-rejected regardless
      await supabase.from('expenses').update({ status: 'rejected' }).eq('id', expenseId)
      return { status: 'rejected' }
    }
    // Non-sequential, non-required: their rejection just means they didn't approve
    // Others can still approve and meet the threshold
    return { status: 'pending' }
  }

  // APPROVAL LOGIC — SEQUENTIAL MODE
  if (rule.sequential) {
    const nextStep = expense.current_step + 1
    const { data: nextApprover } = await supabase
      .from('rule_approvers')
      .select('approver_id')
      .eq('rule_id', expense.rule_id)
      .eq('step_order', nextStep)
      .maybeSingle()

    if (!nextApprover) {
      // No more steps — fully approved
      await supabase.from('expenses').update({ status: 'approved' }).eq('id', expenseId)
      return { status: 'approved' }
    } else {
      // Advance to next approver
      await supabase.from('approval_actions').insert({
        expense_id: expenseId,
        approver_id: nextApprover.approver_id,
        step_order: nextStep,
        status: 'pending'
      })
      await supabase.from('expenses').update({ current_step: nextStep }).eq('id', expenseId)
      return { status: 'pending', nextStep }
    }
  }

  // APPROVAL LOGIC — NON-SEQUENTIAL MODE
  const { data: allActions } = await supabase
    .from('approval_actions')
    .select('status, approver_id')
    .eq('expense_id', expenseId)

  const { data: allApproverRules } = await supabase
    .from('rule_approvers')
    .select('approver_id, is_required')
    .eq('rule_id', expense.rule_id)

  // All required approvers must have approved
  const requiredApprovers = allApproverRules.filter(r => r.is_required)
  const requiredMet = requiredApprovers.every(r => {
    const a = allActions.find(a => a.approver_id === r.approver_id)
    return a?.status === 'approved'
  })

  // Percentage threshold must be met
  const approvedCount = allActions.filter(a => a.status === 'approved').length
  const total = allActions.length
  const pctMet = rule.min_approval_pct === 0 ||
    (approvedCount / total * 100) >= rule.min_approval_pct

  if (requiredMet && pctMet) {
    await supabase.from('expenses').update({ status: 'approved' }).eq('id', expenseId)
    return { status: 'approved' }
  }

  return { status: 'pending' }
}