/**
 * Local Pattern Matching AI Provider (Phase 4 Format)
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
    let riskLevel = 'low';
    let requiresApproval = false;
    let suggestedWorkflow = '';
    
    // 1. Identify Customer
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
      entities.jobType = 'boiler_service';
    } else if (t.includes('leak')) {
      entities.jobType = 'leak_repair';
    }
    
    // 3. Complete Job Intent
    if (t.includes('finished') || t.includes('completed') || t.includes('done')) {
      intents.push('complete_job');
      suggestedWorkflow = 'complete_job';
    }
    
    // 4. Payment Intent & Amount
    const amountMatch = t.match(/£(\d+)|(\d+)\s*pounds/);
    if (t.includes('paid') || amountMatch) {
      intents.push('record_payment');
      
      if (amountMatch) {
        entities.amount = parseInt(amountMatch[1] || amountMatch[2], 10);
      }
      
      if (t.includes('card')) entities.paymentMethod = 'card';
      else if (t.includes('cash')) entities.paymentMethod = 'cash';
      else if (t.includes('bank') || t.includes('bacs')) entities.paymentMethod = 'bank_transfer';
      
      intents.push('create_invoice_draft');
      requiresApproval = true;
    }
    
    // 5. Reminder Intent
    if (t.includes('book her annual') || t.includes('remind') || t.includes('annual service')) {
      intents.push('create_annual_service_reminder');
      entities.reminderDate = new Date(Date.now() + 365*24*60*60*1000).toISOString();
      requiresApproval = true;
    }

    // 6. Other Commands
    if (t.includes('who owes') || t.includes('overdue')) {
      intents.push('check_overdue_invoices');
    }
    
    if (t.includes('what\'s on today') || t.includes('morning briefing')) {
      intents.push('show_today_jobs');
    }

    if (intents.length === 0) {
       intents.push('ask_business_question');
    }

    return {
      intents,
      entities,
      confidence: intents.length > 0 ? 0.95 : 0.0,
      riskLevel,
      requiresApproval,
      suggestedWorkflow,
      missingInformation: [],
      safeToExecute: true,
      userConfirmationRequired: requiresApproval,
      explanation: "Parsed via local pattern provider."
    };
  }
}
