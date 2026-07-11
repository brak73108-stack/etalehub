/**
 * EtaleHub — Demo Data Seeder
 * Populates the database with realistic UK plumbing/heating demo data on first load.
 */

import { getDB } from './database.js';
import * as customersDb from './customers.js';
import * as jobsDb from './jobs.js';
import * as invoicesDb from './invoices.js';
import * as quotesDb from './quotes.js';
import * as remindersDb from './reminders.js';
import * as approvalsDb from './approvals.js';
import * as auditDb from './audit.js';
import * as aiActionsDb from './ai-actions.js';

// Helper to generate dates relative to today
const today = new Date('2026-07-10T09:00:00Z');

function daysAgo(days) {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysFromNow(days) {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Check if the database is already seeded
 */
async function isSeeded() {
  const allCustomers = await customersDb.getAll();
  return allCustomers.length > 0;
}

/**
 * Clear the database (mostly for development testing)
 */
export async function resetDatabase() {
  console.log('[Seed] Resetting database (developer mode)');
  const db = await getDB();
  const tx = db.transaction(
    ['customers', 'jobs', 'invoices', 'quotes', 'reminders', 'approvals', 'auditLog', 'aiActions', 'settings'],
    'readwrite'
  );
  tx.objectStore('customers').clear();
  tx.objectStore('jobs').clear();
  tx.objectStore('invoices').clear();
  tx.objectStore('quotes').clear();
  tx.objectStore('reminders').clear();
  tx.objectStore('approvals').clear();
  tx.objectStore('auditLog').clear();
  tx.objectStore('aiActions').clear();
  tx.objectStore('settings').clear();
  
  return new Promise((resolve) => {
    tx.oncomplete = () => {
      console.log('[Seed] Database cleared');
      resolve();
    };
  });
}

/**
 * Run the seeder to populate all tables
 */
export async function seedDatabase() {
  console.log('[Seed] Checking database...');
  
  if (await isSeeded()) {
    console.log('[Seed] Existing data found, skipping seed.');
    return;
  }
  
  console.log('[Seed] Database empty. Seeding demo data...');

  try {
    // 1. CUSTOMERS (8 records)
    const cust1 = await customersDb.create({
      name: 'Mrs Patricia Smith',
      email: 'patricia.smith@example.co.uk',
      phone: '07700 900123',
      address: '42 Oak Lane, Bristol BS3 4QR',
      propertyNotes: 'Gate is stiff. Dog named Buster (friendly).',
      equipmentList: ['Worcester Bosch Greenstar 30i Combi', 'Megaflo Eco 170i Unvented Cylinder'],
      preferredContact: 'email',
      communicationStyle: 'formal',
      customerStatus: 'active',
      notes: 'Loyal customer. Always pays on time.',
      lastServiceDate: daysAgo(360),
      nextServiceDue: daysFromNow(5),
      lifetimeValue: 1240,
      createdAt: daysAgo(730),
      updatedAt: daysAgo(360)
    });

    const cust2 = await customersDb.create({
      name: 'Ahmed Khan',
      email: 'ahmed.khan@example.com',
      phone: '07700 900456',
      address: '15 Maple Drive, Bristol BS7 8TN',
      propertyNotes: 'Park on the driveway.',
      equipmentList: ['Vaillant ecoTEC Plus 832 Combi', 'Nest Learning Thermostat'],
      preferredContact: 'phone',
      communicationStyle: 'casual',
      customerStatus: 'active',
      notes: 'Busy professional.',
      lastServiceDate: daysAgo(110),
      nextServiceDue: daysFromNow(255),
      lifetimeValue: 680,
      createdAt: daysAgo(115),
      updatedAt: daysAgo(110)
    });

    const cust3 = await customersDb.create({
      name: 'Sarah Brown',
      email: 's.brown88@example.co.uk',
      phone: '07700 900789',
      address: '8 Elm Street, Bath BA1 5RG',
      propertyNotes: 'Basement flat, use side entrance.',
      equipmentList: ['Ideal Logic Plus C30 Combi', 'Honeywell T4 Programmer'],
      preferredContact: 'email',
      communicationStyle: 'concise',
      customerStatus: 'active',
      notes: '',
      lastServiceDate: daysAgo(180),
      nextServiceDue: daysFromNow(185),
      lifetimeValue: 1850,
      createdAt: daysAgo(900),
      updatedAt: daysAgo(180)
    });

    const cust4 = await customersDb.create({
      name: 'John Williams',
      email: 'jwilliams.bristol@example.com',
      phone: '07700 900321',
      address: '23 Cedar Close, Bristol BS9 1JL',
      propertyNotes: 'Beware of cat.',
      equipmentList: ['Baxi 830 Combi Boiler'],
      preferredContact: 'sms',
      communicationStyle: 'casual',
      customerStatus: 'active',
      notes: 'Needs annual reminder.',
      lastServiceDate: daysAgo(370),
      nextServiceDue: daysAgo(5),
      lifetimeValue: 920,
      createdAt: daysAgo(740),
      updatedAt: daysAgo(370)
    });

    const cust5 = await customersDb.create({
      name: 'David & Emma Taylor',
      email: 'thetaylors@example.co.uk',
      phone: '0117 496 0012',
      address: '67 Birch Avenue, Keynsham BS31 2DQ',
      propertyNotes: '',
      equipmentList: ['Worcester Bosch Greenstar 25Si Combi', 'Hive Active Heating'],
      preferredContact: 'phone',
      communicationStyle: 'friendly',
      customerStatus: 'active',
      notes: '',
      lastServiceDate: daysAgo(400),
      nextServiceDue: daysAgo(35),
      lifetimeValue: 450,
      createdAt: daysAgo(400),
      updatedAt: daysAgo(400)
    });

    const cust6 = await customersDb.create({
      name: "Margaret O'Brien",
      email: 'margaret.obrien@example.com',
      phone: '07700 900654',
      address: '3 Willow Court, Bristol BS6 7HN',
      propertyNotes: '',
      equipmentList: ['Ideal Vogue Max C32 Combi', 'Megaflo Eco 210i'],
      preferredContact: 'phone',
      communicationStyle: 'formal',
      customerStatus: 'inactive',
      notes: 'Moved house last year.',
      lastServiceDate: daysAgo(500),
      nextServiceDue: daysAgo(135),
      lifetimeValue: 2100,
      createdAt: daysAgo(1000),
      updatedAt: daysAgo(500)
    });

    const cust7 = await customersDb.create({
      name: 'James Cooper',
      email: 'james.c@example.co.uk',
      phone: '07700 900987',
      address: '91 Pine Road, Clevedon BS21 6RT',
      propertyNotes: 'New build estate.',
      equipmentList: ['Glow-worm Betacom4 30C Combi'],
      preferredContact: 'sms',
      communicationStyle: 'casual',
      customerStatus: 'new',
      notes: 'Found us via Google.',
      lastServiceDate: null,
      nextServiceDue: null,
      lifetimeValue: 0,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1)
    });

    const cust8 = await customersDb.create({
      name: 'Lisa & Mark Chen',
      email: 'chen.family@example.com',
      phone: '07700 900111',
      address: '14 Ash Grove, Bristol BS4 3PN',
      propertyNotes: '',
      equipmentList: ['Viessmann Vitodens 050-W Combi', 'Tado Smart Thermostat'],
      preferredContact: 'email',
      communicationStyle: 'friendly',
      customerStatus: 'active',
      notes: '',
      lastServiceDate: daysAgo(200),
      nextServiceDue: daysFromNow(165),
      lifetimeValue: 560,
      createdAt: daysAgo(560),
      updatedAt: daysAgo(200)
    });

    // 2. JOBS (15 records)
    // Mrs Smith - Completed boiler service (last year)
    const job1 = await jobsDb.create({
      customerId: cust1,
      title: 'Annual Boiler Service',
      description: 'Standard annual service on Worcester Bosch',
      status: 'complete',
      scheduledDate: daysAgo(360),
      completedDate: daysAgo(360),
      jobType: 'boiler_service',
      notes: ['All parameters normal. Filter cleaned.'],
      photos: [],
      finalPrice: 85,
      paymentStatus: 'paid',
      paymentMethod: 'card',
      followUpRequired: false,
      serviceHistoryNote: 'Full service completed safely.',
      createdAt: daysAgo(370),
      updatedAt: daysAgo(360)
    });

    // Mrs Smith - Scheduled boiler service (today! For testing the workflow)
    const job2 = await jobsDb.create({
      customerId: cust1,
      title: 'Annual Boiler Service 2026',
      description: 'Annual service on Worcester Bosch Greenstar',
      status: 'booked',
      scheduledDate: today.toISOString(),
      completedDate: null,
      jobType: 'boiler_service',
      notes: ['Check expansion vessel pressure.'],
      photos: [],
      finalPrice: null,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      followUpRequired: false,
      serviceHistoryNote: '',
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2)
    });

    // Ahmed Khan - Leak repair (In Progress)
    const job3 = await jobsDb.create({
      customerId: cust2,
      title: 'Under-sink leak repair',
      description: 'Customer reported dripping under kitchen sink',
      status: 'in_progress',
      scheduledDate: today.toISOString(),
      completedDate: null,
      jobType: 'leak_repair',
      notes: ['Needs new trap.'],
      photos: [],
      finalPrice: null,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      followUpRequired: false,
      serviceHistoryNote: '',
      createdAt: daysAgo(1),
      updatedAt: today.toISOString()
    });

    // Sarah Brown - Radiator replacement (Quoted)
    const job4 = await jobsDb.create({
      customerId: cust3,
      title: 'Replace living room radiator',
      description: 'Upgrade to Type 22 double convector',
      status: 'quoted',
      scheduledDate: null,
      completedDate: null,
      jobType: 'radiator_replacement',
      notes: ['Awaiting customer approval on quote Q-002.'],
      photos: [],
      finalPrice: null,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      followUpRequired: true,
      serviceHistoryNote: '',
      createdAt: daysAgo(5),
      updatedAt: daysAgo(3)
    });

    // John Williams - Annual service reminder related job (Complete, not invoiced)
    const job5 = await jobsDb.create({
      customerId: cust4,
      title: 'Annual Boiler Service',
      description: 'Overdue annual service completed',
      status: 'complete',
      scheduledDate: daysAgo(2),
      completedDate: daysAgo(2),
      jobType: 'boiler_service',
      notes: ['Burner needed deep clean. Electrodes replaced.'],
      photos: [],
      finalPrice: 130,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      followUpRequired: false,
      serviceHistoryNote: 'Electrodes replaced during service.',
      createdAt: daysAgo(7),
      updatedAt: daysAgo(2)
    });

    // David & Emma Taylor - Tap replacement (Overdue unpaid)
    const job6 = await jobsDb.create({
      customerId: cust5,
      title: 'Kitchen tap replacement',
      description: 'Supplied and fitted new mixer tap',
      status: 'complete',
      scheduledDate: daysAgo(40),
      completedDate: daysAgo(40),
      jobType: 'tap_replacement',
      notes: [],
      photos: [],
      finalPrice: 120,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      followUpRequired: true,
      serviceHistoryNote: 'Bristan mixer tap installed.',
      createdAt: daysAgo(42),
      updatedAt: daysAgo(40)
    });

    // James Cooper - Boiler install (Enquiry)
    const job7 = await jobsDb.create({
      customerId: cust7,
      title: 'New Boiler Installation',
      description: 'Quote for combi swap',
      status: 'enquiry',
      scheduledDate: null,
      completedDate: null,
      jobType: 'installation',
      notes: ['Needs site visit to spec flue routing.'],
      photos: [],
      finalPrice: null,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      followUpRequired: true,
      serviceHistoryNote: '',
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1)
    });

    // Lisa & Mark Chen - Emergency Callout (Complete)
    const job8 = await jobsDb.create({
      customerId: cust8,
      title: 'No heating/hot water',
      description: 'Boiler locked out. F.22 fault code.',
      status: 'complete',
      scheduledDate: daysAgo(10),
      completedDate: daysAgo(10),
      jobType: 'emergency_callout',
      notes: ['Repressurised system and checked for leaks.'],
      photos: [],
      finalPrice: 90,
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      followUpRequired: false,
      serviceHistoryNote: 'System repressurised.',
      createdAt: daysAgo(10),
      updatedAt: daysAgo(9)
    });

    // Margaret O'Brien - Boiler Service (Complete)
    const job9 = await jobsDb.create({
      customerId: cust6,
      title: 'Annual Service',
      description: 'Service before moving out',
      status: 'complete',
      scheduledDate: daysAgo(500),
      completedDate: daysAgo(500),
      jobType: 'boiler_service',
      notes: [],
      photos: [],
      finalPrice: 85,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      followUpRequired: false,
      serviceHistoryNote: 'Service cert issued.',
      createdAt: daysAgo(505),
      updatedAt: daysAgo(500)
    });

    // Mrs Smith - Radiator repair (Complete)
    const job10 = await jobsDb.create({
      customerId: cust1,
      title: 'Replace TRV',
      description: 'Bedroom radiator TRV stuck closed',
      status: 'complete',
      scheduledDate: daysAgo(180),
      completedDate: daysAgo(180),
      jobType: 'radiator_replacement',
      notes: ['Fitted new Drayton TRV4.'],
      photos: [],
      finalPrice: 75,
      paymentStatus: 'paid',
      paymentMethod: 'card',
      followUpRequired: false,
      serviceHistoryNote: 'Bedroom TRV replaced.',
      createdAt: daysAgo(182),
      updatedAt: daysAgo(180)
    });

    // Sarah Brown - Boiler repair (Complete)
    const job11 = await jobsDb.create({
      customerId: cust3,
      title: 'Boiler making banging noise',
      description: 'Kettling noise from boiler',
      status: 'complete',
      scheduledDate: daysAgo(180),
      completedDate: daysAgo(180),
      jobType: 'repair',
      notes: ['System sludged up. Added cleaner. Needs powerflush long-term.'],
      photos: [],
      finalPrice: 110,
      paymentStatus: 'paid',
      paymentMethod: 'card',
      followUpRequired: false,
      serviceHistoryNote: 'Added X400 cleaner.',
      createdAt: daysAgo(181),
      updatedAt: daysAgo(180)
    });

    // Ahmed Khan - Scheduled service (Booked for tomorrow)
    const job12 = await jobsDb.create({
      customerId: cust2,
      title: 'Annual Service',
      description: 'Routine service',
      status: 'booked',
      scheduledDate: daysFromNow(1),
      completedDate: null,
      jobType: 'boiler_service',
      notes: [],
      photos: [],
      finalPrice: null,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      followUpRequired: false,
      serviceHistoryNote: '',
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10)
    });

    // John Williams - Powerflush (Quoted)
    const job13 = await jobsDb.create({
      customerId: cust4,
      title: 'System Powerflush',
      description: 'Magnacleanse flush of 8 radiators',
      status: 'quoted',
      scheduledDate: null,
      completedDate: null,
      jobType: 'powerflush',
      notes: [],
      photos: [],
      finalPrice: null,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      followUpRequired: true,
      serviceHistoryNote: '',
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1)
    });

    // Lisa & Mark Chen - Shower install (In Progress)
    const job14 = await jobsDb.create({
      customerId: cust8,
      title: 'Install Mira Sport electric shower',
      description: 'Replace faulty shower',
      status: 'in_progress',
      scheduledDate: today.toISOString(),
      completedDate: null,
      jobType: 'installation',
      notes: ['Waiting for parts delivery this afternoon.'],
      photos: [],
      finalPrice: null,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      followUpRequired: false,
      serviceHistoryNote: '',
      createdAt: daysAgo(3),
      updatedAt: today.toISOString()
    });

    // David & Emma Taylor - Boiler Service (Enquiry)
    const job15 = await jobsDb.create({
      customerId: cust5,
      title: 'Boiler Service Enquiry',
      description: 'Requested via website',
      status: 'enquiry',
      scheduledDate: null,
      completedDate: null,
      jobType: 'boiler_service',
      notes: [],
      photos: [],
      finalPrice: null,
      paymentStatus: 'unpaid',
      paymentMethod: null,
      followUpRequired: true,
      serviceHistoryNote: '',
      createdAt: daysAgo(0),
      updatedAt: daysAgo(0)
    });

    // 3. INVOICES (10 records)
    // Mrs Smith - Paid boiler service
    await invoicesDb.create({
      invoiceNumber: 'EH-0001',
      customerId: cust1,
      jobId: job1,
      lineItems: [{ description: 'Annual Boiler Service', amount: 85 }],
      subtotal: 85, taxRate: 0, taxAmount: 0, total: 85,
      status: 'paid',
      paymentMethod: 'card',
      paidDate: daysAgo(358),
      dueDate: daysAgo(346),
      createdAt: daysAgo(360),
      updatedAt: daysAgo(358)
    });

    // Mrs Smith - Paid TRV replacement
    await invoicesDb.create({
      invoiceNumber: 'EH-0002',
      customerId: cust1,
      jobId: job10,
      lineItems: [
        { description: 'Labour (1 hr)', amount: 60 },
        { description: 'Drayton TRV4', amount: 15 }
      ],
      subtotal: 75, taxRate: 0, taxAmount: 0, total: 75,
      status: 'paid',
      paymentMethod: 'card',
      paidDate: daysAgo(180),
      dueDate: daysAgo(166),
      createdAt: daysAgo(180),
      updatedAt: daysAgo(180)
    });

    // Sarah Brown - Paid Boiler repair
    await invoicesDb.create({
      invoiceNumber: 'EH-0003',
      customerId: cust3,
      jobId: job11,
      lineItems: [
        { description: 'Callout and Labour', amount: 90 },
        { description: 'Sentinel X400 System Restorer', amount: 20 }
      ],
      subtotal: 110, taxRate: 0, taxAmount: 0, total: 110,
      status: 'paid',
      paymentMethod: 'card',
      paidDate: daysAgo(178),
      dueDate: daysAgo(166),
      createdAt: daysAgo(180),
      updatedAt: daysAgo(178)
    });

    // David & Emma Taylor - Overdue tap replacement
    await invoicesDb.create({
      invoiceNumber: 'EH-0004',
      customerId: cust5,
      jobId: job6,
      lineItems: [
        { description: 'Labour (1 hr)', amount: 60 },
        { description: 'Bristan Mixer Tap', amount: 60 }
      ],
      subtotal: 120, taxRate: 0, taxAmount: 0, total: 120,
      status: 'overdue',
      paymentMethod: null,
      paidDate: null,
      dueDate: daysAgo(26), // 14 day terms on 40 days ago
      createdAt: daysAgo(40),
      updatedAt: daysAgo(40)
    });

    // Lisa & Mark Chen - Paid emergency callout
    await invoicesDb.create({
      invoiceNumber: 'EH-0005',
      customerId: cust8,
      jobId: job8,
      lineItems: [{ description: 'Emergency Callout fee', amount: 90 }],
      subtotal: 90, taxRate: 0, taxAmount: 0, total: 90,
      status: 'paid',
      paymentMethod: 'bank_transfer',
      paidDate: daysAgo(9),
      dueDate: daysFromNow(4),
      createdAt: daysAgo(10),
      updatedAt: daysAgo(9)
    });

    // John Williams - Draft invoice for completed job
    await invoicesDb.create({
      invoiceNumber: 'EH-0006',
      customerId: cust4,
      jobId: job5,
      lineItems: [
        { description: 'Annual Boiler Service', amount: 85 },
        { description: 'Replacement electrodes set', amount: 45 }
      ],
      subtotal: 130, taxRate: 0, taxAmount: 0, total: 130,
      status: 'draft',
      paymentMethod: null,
      paidDate: null,
      dueDate: daysFromNow(12),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2)
    });

    // Some dummy sent invoices awaiting payment
    await invoicesDb.create({
      invoiceNumber: 'EH-0007',
      customerId: cust3,
      jobId: job11,
      lineItems: [{ description: 'Follow-up inspection', amount: 50 }],
      subtotal: 50, taxRate: 0, taxAmount: 0, total: 50,
      status: 'sent',
      paymentMethod: null,
      paidDate: null,
      dueDate: daysFromNow(5),
      createdAt: daysAgo(9),
      updatedAt: daysAgo(9)
    });

    await invoicesDb.create({
      invoiceNumber: 'EH-0008',
      customerId: cust2,
      jobId: job12,
      lineItems: [{ description: 'Pre-billed parts deposit', amount: 100 }],
      subtotal: 100, taxRate: 0, taxAmount: 0, total: 100,
      status: 'sent',
      paymentMethod: null,
      paidDate: null,
      dueDate: daysFromNow(2),
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12)
    });

    await invoicesDb.create({
      invoiceNumber: 'EH-0009',
      customerId: cust6,
      jobId: job9,
      lineItems: [{ description: 'Final reading and cap off', amount: 75 }],
      subtotal: 75, taxRate: 0, taxAmount: 0, total: 75,
      status: 'paid',
      paymentMethod: 'cash',
      paidDate: daysAgo(499),
      dueDate: daysAgo(486),
      createdAt: daysAgo(500),
      updatedAt: daysAgo(499)
    });

    // 4. QUOTES (3 records)
    await quotesDb.create({
      quoteNumber: 'Q-001',
      customerId: cust7,
      lineItems: [
        { description: 'Worcester Bosch 4000 30kW', amount: 1200 },
        { description: 'Labour & Materials', amount: 1600 }
      ],
      total: 2800,
      status: 'draft',
      followUpDate: null,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1)
    });

    await quotesDb.create({
      quoteNumber: 'Q-002',
      customerId: cust3,
      lineItems: [
        { description: 'Type 22 Double Convector 600x1200', amount: 180 },
        { description: 'Labour', amount: 150 }
      ],
      total: 330,
      status: 'sent',
      followUpDate: daysFromNow(2),
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5)
    });

    await quotesDb.create({
      quoteNumber: 'Q-003',
      customerId: cust8,
      lineItems: [
        { description: 'Tap replacement parts & labour', amount: 130 }
      ],
      total: 130,
      status: 'accepted',
      followUpDate: null,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(18)
    });

    // 5. REMINDERS (5 records)
    await remindersDb.create({
      customerId: cust1,
      jobId: job2,
      type: 'annual_service',
      reminderType: 'Annual Service Due',
      message: 'Mrs Smith\'s boiler service is due.',
      scheduledDate: today.toISOString(),
      status: 'pending',
      recurrence: 'annual',
      createdByAI: true,
      createdAt: daysAgo(360),
      updatedAt: daysAgo(360)
    });

    await remindersDb.create({
      customerId: cust4,
      jobId: null,
      type: 'annual_service',
      reminderType: 'Overdue Annual Service',
      message: 'John Williams service is 5 days overdue.',
      scheduledDate: daysAgo(5),
      status: 'pending',
      recurrence: 'annual',
      createdByAI: true,
      createdAt: daysAgo(370),
      updatedAt: daysAgo(370)
    });

    await remindersDb.create({
      customerId: cust5,
      jobId: job6,
      type: 'payment',
      reminderType: 'Overdue Invoice',
      message: 'Chase David & Emma Taylor for invoice EH-0004 (£120.00)',
      scheduledDate: daysAgo(20),
      status: 'pending',
      recurrence: 'none',
      createdByAI: true,
      createdAt: daysAgo(25),
      updatedAt: daysAgo(25)
    });

    await remindersDb.create({
      customerId: cust3,
      jobId: job4,
      type: 'quote_follow_up',
      reminderType: 'Follow up on Quote',
      message: 'Check if Sarah Brown wants to proceed with radiator Q-002.',
      scheduledDate: daysFromNow(2),
      status: 'pending',
      recurrence: 'none',
      createdByAI: false,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5)
    });

    await remindersDb.create({
      customerId: cust2,
      jobId: null,
      type: 'custom',
      reminderType: 'Part arrival',
      message: 'Check if trap arrived for Ahmed Khan.',
      scheduledDate: today.toISOString(),
      status: 'pending',
      recurrence: 'none',
      createdByAI: false,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1)
    });

    // 6. APPROVALS (3 records)
    await approvalsDb.create({
      actionType: 'send_payment_reminder',
      entityType: 'invoice',
      entityId: 4, // EH-0004
      proposedAction: {
        description: 'Send overdue payment reminder via SMS',
        detail: 'To David & Emma Taylor for £120.00'
      },
      riskLevel: 'high',
      status: 'pending',
      createdAt: daysAgo(1),
      approvedAt: null,
      rejectedAt: null
    });

    await approvalsDb.create({
      actionType: 'send_annual_service_reminder',
      entityType: 'customer',
      entityId: cust1,
      proposedAction: {
        description: 'Send annual service booking link via Email',
        detail: 'To Mrs Patricia Smith'
      },
      riskLevel: 'medium',
      status: 'pending',
      createdAt: daysAgo(0),
      approvedAt: null,
      rejectedAt: null
    });

    await approvalsDb.create({
      actionType: 'send_quote',
      entityType: 'quote',
      entityId: 1, // Q-001
      proposedAction: {
        description: 'Send boiler installation quote Q-001',
        detail: 'To James Cooper for £2,800.00'
      },
      riskLevel: 'medium',
      status: 'pending',
      createdAt: daysAgo(0),
      approvedAt: null,
      rejectedAt: null
    });

    // 7. AI ACTIONS (5 records)
    await aiActionsDb.create({
      inputText: 'What\'s on today?',
      interpretedIntent: 'daily_briefing',
      extractedEntities: {},
      proposedActions: [{ type: 'daily_briefing', description: 'Generate morning briefing', safe: true }],
      executedActions: [{ type: 'daily_briefing', description: 'Generate morning briefing', safe: true }],
      confidenceScore: 0.98,
      riskLevel: 'low',
      createdAt: daysAgo(0)
    });

    await aiActionsDb.create({
      inputText: 'John Williams paid his invoice',
      interpretedIntent: 'record_payment',
      extractedEntities: { customer: 'John Williams' },
      proposedActions: [{ type: 'mark_invoice_paid', description: 'Mark EH-0006 as paid', safe: true }],
      executedActions: [],
      confidenceScore: 0.85,
      riskLevel: 'low',
      createdAt: daysAgo(1)
    });

    // 8. AUDIT LOG (20 entries - randomly distributed)
    const auditActions = [
      { action: 'customer_created', type: 'customer', msg: 'Customer record created manually' },
      { action: 'job_created', type: 'job', msg: 'Job created via web form' },
      { action: 'invoice_drafted', type: 'invoice', msg: 'Draft invoice EH-0006 created' },
      { action: 'payment_recorded', type: 'invoice', msg: 'Recorded card payment of £85' },
      { action: 'reminder_created', type: 'reminder', msg: 'Set annual service reminder' },
      { action: 'quote_sent', type: 'quote', msg: 'Quote Q-002 sent via email' },
      { action: 'approval_requested', type: 'approval', msg: 'Requested approval to send reminder' }
    ];

    for (let i = 0; i < 20; i++) {
      const act = auditActions[Math.floor(Math.random() * auditActions.length)];
      await auditDb.create({
        action: act.action,
        entityType: act.type,
        entityId: Math.floor(Math.random() * 5) + 1,
        details: { message: act.msg },
        beforeData: null,
        afterData: null,
        source: Math.random() > 0.5 ? 'ai' : 'user',
        riskLevel: 'low',
        approvalStatus: 'auto',
        timestamp: daysAgo(Math.floor(Math.random() * 30))
      });
    }

    console.log('[Seed] Demo data inserted successfully.');
    
    // 9. Seed Settings
    const { resetSettingsToDefaults } = await import('../services/data/business-settings-service.js');
    await resetSettingsToDefaults();
    console.log('[Seed] Default settings applied.');

  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
  }
}
