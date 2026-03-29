import { supabase } from './supabase'

// Call this when an employee submits an expense
// Initializes the approval chain based on the assigned rule
export async function initApprovalChain(expenseId, ruleId, employeeManagerId, isManagerApprover) {
  // Fetch rule + approvers
  const { data: rule } = await supabase
    .from('approval_rules')
    .select('*, rule_approvers(*, users(*))')
    .eq('id', ruleId)
    .single()

  let steps = [...(rule.rule_approvers || [])].sort((a, b) => a.step_order - b.step_order)

  // Inject manager as step 0 if is_manager_approver is true
  if (isManagerApprover && employeeManagerId) {
    steps = [
      { approver_id: employeeManagerId, step_order: 0, injected: true },
      ...steps.map(s => ({ ...s, step_order: s.step_order + 1 })),
    ]
  }

  // Insert all approval steps
  const inserts = steps.map(s => ({
    expense_id: expenseId,
    approver_id: s.approver_id,
    step_order: s.step_order,
    status: 'pending',
  }))

  await supabase.from('approval_actions').insert(inserts)

  // Set expense to pending at step 0
  await supabase
    .from('expenses')
    .update({ status: 'pending', current_step: 0 })
    .eq('id', expenseId)
}

// Call this when a manager/approver takes action on an expense
export async function processApproval(expenseId, approverId, action, comment) {
  // 1. Fetch expense + its rule
  const { data: expense } = await supabase
    .from('expenses')
    .select('*, approval_rules(*)')
    .eq('id', expenseId)
    .single()

  const rule = expense.approval_rules

  // 2. Record this action
  await supabase
    .from('approval_actions')
    .update({ status: action, comment, acted_at: new Date().toISOString() })
    .eq('expense_id', expenseId)
    .eq('approver_id', approverId)
    .eq('step_order', expense.current_step)

  // 3. If rejected → expense is rejected immediately
  if (action === 'rejected') {
    await supabase.from('expenses').update({ status: 'rejected' }).eq('id', expenseId)
    return { status: 'rejected' }
  }

  // 4. Fetch all actions for this expense
  const { data: allActions } = await supabase
    .from('approval_actions')
    .select('*')
    .eq('expense_id', expenseId)

  const total = allActions.length
  const approved = allActions.filter(a => a.status === 'approved').length

  // 5. Check percentage rule
  if (rule.min_approval_pct > 0) {
    const pct = (approved / total) * 100
    if (pct >= rule.min_approval_pct) {
      await supabase.from('expenses').update({ status: 'approved' }).eq('id', expenseId)
      return { status: 'approved' }
    }
  }

  // 6. Sequential mode: move to next step
  if (rule.sequential) {
    const nextStep = expense.current_step + 1
    const nextAction = allActions.find(a => a.step_order === nextStep)

    if (!nextAction) {
      // No more steps → approved
      await supabase.from('expenses').update({ status: 'approved' }).eq('id', expenseId)
      return { status: 'approved' }
    }

    // Move to next step
    await supabase.from('expenses').update({ current_step: nextStep }).eq('id', expenseId)
    return { status: 'pending', nextApproverId: nextAction.approver_id }
  }

  // 7. Non-sequential: check if all approved
  if (approved === total) {
    await supabase.from('expenses').update({ status: 'approved' }).eq('id', expenseId)
    return { status: 'approved' }
  }

  return { status: 'pending' }
}
