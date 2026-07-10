/**
 * Local Pattern Matching AI Provider
 * Rule-based fallback/MVP provider that uses regex and pattern matching
 * to extract intents and entities from natural language commands.
 */

export class LocalPatternProvider {
  getName() {
    return 'local-pattern';
  }

  async processCommand(text) {
    const t = text.toLowerCase();
    
    const intents = [];
    const entities = {};
    const actions = [];
    let riskLevel = 'low';
    
    // 1. Identify Customer
    // Simple mock detection for Phase 2 demo
    if (t.includes('mrs smith') || t.includes('smith')) {
      entities.customerName = 'Mrs Patricia Smith';
    } else if (t.includes('ahmed') || t.includes('khan')) {
      entities.customerName = 'Ahmed Khan';
    } else if (t.includes('sarah') || t.includes('brown')) {
      entities.customerName = 'Sarah Brown';
    } else if (t.includes('john') || t.includes('williams')) {
      entities.customerName = 'John Williams';
    }
    
    // 2. Identify Job/Service Type
    if (t.includes('boiler service') || t.includes('service')) {
      entities.serviceType = 'boiler_service';
    } else if (t.includes('leak')) {
      entities.serviceType = 'leak_repair';
    } else if (t.includes('radiator')) {
      entities.serviceType = 'radiator_replacement';
    } else if (t.includes('tap')) {
      entities.serviceType = 'tap_replacement';
    }
    
    // 3. Complete Job Intent
    if (t.includes('finished') || t.includes('completed') || t.includes('done') || t.includes('wrapped up')) {
      intents.push('complete_job');
      actions.push({
        type: 'complete_job',
        description: `Mark ${entities.serviceType ? entities.serviceType.replace('_', ' ') : 'job'} as complete`,
        safe: true,
        data: { customerName: entities.customerName, serviceType: entities.serviceType }
      });
    }
    
    // 4. Payment Intent & Amount
    const amountMatch = t.match(/£(\d+)|(\d+)\s*pounds/);
    if (t.includes('paid') || amountMatch) {
      intents.push('record_payment');
      
      if (amountMatch) {
        entities.amount = parseInt(amountMatch[1] || amountMatch[2], 10);
        entities.currency = 'GBP';
      }
      
      if (t.includes('card')) entities.paymentMethod = 'card';
      else if (t.includes('cash')) entities.paymentMethod = 'cash';
      else if (t.includes('bank') || t.includes('bacs')) entities.paymentMethod = 'bank_transfer';
      
      actions.push({
        type: 'record_payment',
        description: `Record payment of £${entities.amount} by ${entities.paymentMethod || 'unknown method'}`,
        safe: true,
        data: { amount: entities.amount, paymentMethod: entities.paymentMethod }
      });
      
      intents.push('create_receipt_or_invoice');
      actions.push({
        type: 'create_receipt_or_invoice',
        description: `Draft receipt for £${entities.amount}`,
        safe: true,
        data: { amount: entities.amount }
      });
    }
    
    // 5. Reminder Intent
    if (t.includes('book her annual') || t.includes('remind') || t.includes('annual service')) {
      intents.push('create_annual_service_reminder');
      entities.reminderType = 'annual_service';
      entities.reminderOffset = 12; // months
      
      actions.push({
        type: 'create_annual_service_reminder',
        description: `Create annual service reminder for 12 months from today`,
        safe: true,
        data: { type: 'annual_service', offsetMonths: 12 }
      });
      
      intents.push('update_customer_history');
      actions.push({
        type: 'update_customer_history',
        description: `Update customer service history & dates`,
        safe: true,
        data: {}
      });
    }

    // 6. Other Commands
    if (t.includes('who owes') || t.includes('overdue')) {
      intents.push('check_payments');
      actions.push({ type: 'check_payments', description: 'Check overdue invoices', safe: true, data: {} });
    }
    
    if (t.includes('what\'s on today') || t.includes('morning briefing')) {
      intents.push('daily_briefing');
      actions.push({ type: 'daily_briefing', description: 'Generate morning briefing', safe: true, data: {} });
    }

    // Prepare response
    return {
      originalText: text,
      intent: intents.length > 0 ? intents : ['unknown'],
      entities,
      confidence: intents.length > 0 ? 0.95 : 0.0,
      riskLevel,
      requiresApproval: false, // The parser just identifies raw intent, Safety agent handles approval
      actions,
      suggestedAgent: 'office-manager'
    };
  }
}
