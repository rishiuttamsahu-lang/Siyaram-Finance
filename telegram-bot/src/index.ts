import { Env, TelegramUpdate, Transaction, AuditLog, Member, Building } from './types.ts';
import { parseTelegramMessage } from './parser.ts';
import { FirestoreClient } from './firestore.ts';
import { allocateMemberPayment, computeMemberDues, formatINR } from './allocation.ts';
import { sendTelegramMessage, getHelpMessage } from './telegram.ts';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Health check endpoint
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'Siyaram Finance Telegram Bot Engine',
          runtime: 'Cloudflare Workers (V8 Edge)',
          environment: env.ENVIRONMENT || 'production',
          timestamp: new Date().toISOString(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Convenience Webhook Setup Endpoint: GET /set-webhook?url=https://worker.domain.workers.dev/webhook
    if (request.method === 'GET' && url.pathname === '/set-webhook') {
      if (!env.TELEGRAM_BOT_TOKEN) {
        return new Response('TELEGRAM_BOT_TOKEN is not configured.', { status: 400 });
      }
      const webhookUrl = url.searchParams.get('url') || `${url.origin}/webhook`;
      const secretToken = env.TELEGRAM_SECRET_TOKEN || '';
      const tgApiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(
        webhookUrl
      )}${secretToken ? `&secret_token=${secretToken}` : ''}`;

      const resp = await fetch(tgApiUrl);
      const result = await resp.text();
      return new Response(`Telegram setWebhook Response:\n${result}`, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 3. Telegram Webhook Endpoint: POST /webhook
    if (request.method === 'POST' && url.pathname === '/webhook') {
      if (!env.TELEGRAM_BOT_TOKEN) {
        return new Response('Bot token not set', { status: 500 });
      }

      // Verify secret token header if configured
      if (env.TELEGRAM_SECRET_TOKEN) {
        const headerSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (headerSecret !== env.TELEGRAM_SECRET_TOKEN) {
          return new Response('Unauthorized secret token', { status: 403 });
        }
      }

      let update: TelegramUpdate;
      try {
        update = await request.json();
      } catch {
        return new Response('Invalid JSON payload', { status: 400 });
      }

      const msg = update.message;
      if (!msg || !msg.text || !msg.chat) {
        // Acknowledge non-text messages / updates immediately
        return new Response('OK');
      }

      const chatId = msg.chat.id;
      const rawText = msg.text.trim();
      const senderId = msg.from ? String(msg.from.id) : '';
      const senderName = msg.from
        ? `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || msg.from.username || 'User'
        : 'User';

      // Verify Telegram Allowlist if configured in environment
      if (env.AUTHORIZED_TELEGRAM_IDS) {
        const allowed = env.AUTHORIZED_TELEGRAM_IDS.split(',').map((s) => s.trim());
        if (allowed.length > 0 && !allowed.includes(senderId)) {
          await sendTelegramMessage(
            env.TELEGRAM_BOT_TOKEN,
            chatId,
            `⛔ <b>Access Restricted:</b> Your Telegram ID (<code>${senderId}</code>) is not authorized to log ledger entries. Contact the Admin.`,
            msg.message_id
          );
          return new Response('OK');
        }
      }

      // Initialize Firestore Client
      const db = new FirestoreClient(env);

      try {
        // Fetch current active season, members, and buildings
        const [season, members, buildings] = await Promise.all([
          db.getActiveSeason(),
          db.getMembers(),
          db.getBuildings(),
        ]);

        if (!season) {
          await sendTelegramMessage(
            env.TELEGRAM_BOT_TOKEN,
            chatId,
            `⚠️ <b>No Active Season Found:</b> Please initialize an active season in the Siyaram Admin Panel before recording entries.`,
            msg.message_id
          );
          return new Response('OK');
        }

        // Parse command with Siyaram financial invariants
        const command = parseTelegramMessage(rawText, members, buildings);

        // -----------------------------------------------------------------
        // A. SLASH COMMANDS (/1 to /9, /help, /summary, /dues)
        // -----------------------------------------------------------------
        if (command.type === 'SLASH_COMMAND') {
          const txns = await db.getTransactions(200);
          const activeTxns = txns.filter((t) => t.status === 'ACTIVE');

          let totalOnlineInflows = 0;
          let totalCashInflows = 0;
          let totalOnlineExpenses = 0;
          let totalCashExpenses = 0;

          for (const t of activeTxns) {
            if (t.type === 'EXPENSE') {
              if (t.mode === 'ONLINE') totalOnlineExpenses += t.amount;
              else totalCashExpenses += t.amount;
            } else {
              if (t.mode === 'ONLINE') totalOnlineInflows += t.amount;
              else totalCashInflows += t.amount;
            }
          }

          const totalInflows = totalOnlineInflows + totalCashInflows;
          const totalExpenses = totalOnlineExpenses + totalCashExpenses;
          const netOnlinePool = totalOnlineInflows - totalOnlineExpenses;
          const netCashPool = totalCashInflows - totalCashExpenses;
          const netFestivalBalance = (season.openingBalance || 0) + totalInflows - totalExpenses;

          if (command.command === '/1') {
            const respHtml = `<b>📊 Siyaram Finance Summary (${season.name || season.id})</b>

💰 <b>Net Festival Balance:</b> <code>${formatINR(netFestivalBalance)}</code>
├ <i>Opening Balance:</i> ${formatINR(season.openingBalance || 0)}
├ <i>Total Inflows:</i> +${formatINR(totalInflows)}
└ <i>Total Expenses:</i> -${formatINR(totalExpenses)}

<b>🏦 Fund Segregation Pools:</b>
• <b>Online (UPI Pool):</b> <code>${formatINR(netOnlinePool)}</code>
  ↳ Inflows: +${formatINR(totalOnlineInflows)} | Expenses: -${formatINR(totalOnlineExpenses)}
• <b>Offline (Cash Box):</b> <code>${formatINR(netCashPool)}</code>
  ↳ Inflows: +${formatINR(totalCashInflows)} | Expenses: -${formatINR(totalCashExpenses)}

<i>Live Month: <b>${season.liveMonth || 'N/A'}</b></i>`;
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, respHtml, msg.message_id);
            return new Response('OK');
          }

          if (command.command === '/2') {
            const duesList = members
              .filter((m) => !m.isHonorary)
              .map((m) => ({
                member: m,
                dues: computeMemberDues(m, season),
              }))
              .filter((item) => item.dues.totalDue > 0)
              .sort((a, b) => b.dues.totalDue - a.dues.totalDue);

            if (duesList.length === 0) {
              await sendTelegramMessage(
                env.TELEGRAM_BOT_TOKEN,
                chatId,
                `🎉 <b>All Clear!</b> No outstanding member dues for <b>${season.liveMonth}</b>.`,
                msg.message_id
              );
              return new Response('OK');
            }

            const totalDueSum = duesList.reduce((acc, d) => acc + d.dues.totalDue, 0);
            const lines = duesList.slice(0, 20).map((d, i) => {
              const breakdown =
                d.dues.previousYearPending > 0
                  ? `(Prev: ${formatINR(d.dues.previousYearPending)} + Curr: ${formatINR(d.dues.currentSeasonDue)})`
                  : '';
              return `${i + 1}. <b>${d.member.name}</b>: <code>${formatINR(d.dues.totalDue)}</code> ${breakdown}`;
            });

            const respHtml = `<b>⚠️ Member Outstanding Dues (${duesList.length} members)</b>
Total Outstanding: <b>${formatINR(totalDueSum)}</b>

${lines.join('\n')}${duesList.length > 20 ? `\n<i>...and ${duesList.length - 20} more members</i>` : ''}`;

            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, respHtml, msg.message_id);
            return new Response('OK');
          }

          if (command.command === '/3') {
            const list = activeTxns.filter((t) => t.type !== 'EXPENSE' && t.mode === 'OFFLINE').slice(0, 15);
            const lines = list.map(
              (t) => `• <b>#${t.sequenceNumber}</b> ${t.entityName}: <code>+${formatINR(t.amount)}</code> [Cash]`
            );
            const resp = `<b>💵 Offline Inflows (Cash)</b>\n${lines.length ? lines.join('\n') : 'No entries yet.'}`;
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, resp, msg.message_id);
            return new Response('OK');
          }

          if (command.command === '/4') {
            const list = activeTxns.filter((t) => t.type === 'EXPENSE' && t.mode === 'OFFLINE').slice(0, 15);
            const lines = list.map(
              (t) => `• <b>#${t.sequenceNumber}</b> ${t.entityName}: <code>-${formatINR(t.amount)}</code> [Cash]`
            );
            const resp = `<b>📦 Offline Expenses (Cash)</b>\n${lines.length ? lines.join('\n') : 'No entries yet.'}`;
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, resp, msg.message_id);
            return new Response('OK');
          }

          if (command.command === '/5') {
            const list = activeTxns.filter((t) => t.type !== 'EXPENSE' && t.mode === 'ONLINE').slice(0, 15);
            const lines = list.map(
              (t) => `• <b>#${t.sequenceNumber}</b> ${t.entityName}: <code>+${formatINR(t.amount)}</code> [UPI]`
            );
            const resp = `<b>📱 Online Inflows (UPI)</b>\n${lines.length ? lines.join('\n') : 'No entries yet.'}`;
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, resp, msg.message_id);
            return new Response('OK');
          }

          if (command.command === '/6') {
            const list = activeTxns.filter((t) => t.type === 'EXPENSE' && t.mode === 'ONLINE').slice(0, 15);
            const lines = list.map(
              (t) => `• <b>#${t.sequenceNumber}</b> ${t.entityName}: <code>-${formatINR(t.amount)}</code> [UPI]`
            );
            const resp = `<b>⚡ Online Expenses (UPI)</b>\n${lines.length ? lines.join('\n') : 'No entries yet.'}`;
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, resp, msg.message_id);
            return new Response('OK');
          }

          if (command.command === '/7') {
            const list = activeTxns.filter((t) => t.type !== 'EXPENSE').slice(0, 15);
            const lines = list.map(
              (t) => `• <b>#${t.sequenceNumber}</b> ${t.entityName}: <code>+${formatINR(t.amount)}</code> [${t.mode}]`
            );
            const resp = `<b>📈 Combined Inflow Ledger</b>\n${lines.length ? lines.join('\n') : 'No entries yet.'}`;
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, resp, msg.message_id);
            return new Response('OK');
          }

          if (command.command === '/8') {
            const list = activeTxns.filter((t) => t.type === 'EXPENSE').slice(0, 15);
            const lines = list.map(
              (t) => `• <b>#${t.sequenceNumber}</b> ${t.entityName}: <code>-${formatINR(t.amount)}</code> [${t.mode}]`
            );
            const resp = `<b>📉 Combined Expense Ledger</b>\n${lines.length ? lines.join('\n') : 'No entries yet.'}`;
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, resp, msg.message_id);
            return new Response('OK');
          }

          // /9 or /help
          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, getHelpMessage(), msg.message_id);
          return new Response('OK');
        }

        // -----------------------------------------------------------------
        // B. MEMBER PAYMENT ENTRY (<Name> <Amount> [O])
        // -----------------------------------------------------------------
        if (command.type === 'MEMBER_PAYMENT') {
          const member = members.find(
            (m) => m.name.toLowerCase() === command.memberName.toLowerCase()
          );

          if (!member) {
            await sendTelegramMessage(
              env.TELEGRAM_BOT_TOKEN,
              chatId,
              `❌ Member <b>${command.memberName}</b> not found in database.`,
              msg.message_id
            );
            return new Response('OK');
          }

          // Paused Member Rule: dues are frozen; payments route directly to General Chanda
          if (member.isPaused) {
            const seq = await db.getNextSequenceNumber();
            const txnId = `txn-${Date.now()}-${seq}`;
            const newTxn: Transaction = {
              id: txnId,
              sequenceNumber: seq,
              timestamp: new Date().toISOString(),
              type: 'CHANDA',
              category: 'General Chanda',
              amount: command.amount,
              mode: command.isOnline ? 'ONLINE' : 'OFFLINE',
              status: 'ACTIVE',
              entityId: member.id,
              entityName: `${member.name} (Paused Member)`,
              details: { note: 'Paused member contribution routed to General Chanda' },
              performedBy: `Telegram:${senderName} (${senderId})`,
            };
            await db.saveTransaction(newTxn);

            const audit: AuditLog = {
              id: `audit-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'CREATE',
              txnId,
              targetType: 'TRANSACTION',
              performedBy: `Telegram:${senderName} (${senderId})`,
              newValue: newTxn,
              notes: `Paused member ${member.name} contribution routed to Chanda`,
            };
            await db.saveAuditLog(audit);

            const successMsg = `✅ <b>Chanda Recorded</b> · #${seq}\n\n` +
              `👤 <b>${member.name} (Paused Member)</b>\n` +
              `💰 Amount: <b>${formatINR(command.amount)}</b> [${command.isOnline ? 'ONLINE' : 'CASH'}]\n` +
              `ℹ️ <i>Dues are frozen. Contribution routed directly to General Chanda.</i>`;
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, successMsg, msg.message_id);
            return new Response('OK');
          }

          // Perform Waterfall Allocation
          const allocation = allocateMemberPayment(member, season, command.amount);

          // Update member in Firestore
          const updatedMember: Member = {
            ...member,
            previousYearPending: allocation.remainingPreviousPending,
            payments: allocation.newMemberPayments,
          };
          await db.saveMember(updatedMember);

          // Create Transaction
          const seq = await db.getNextSequenceNumber();
          const txnId = `txn-${Date.now()}-${seq}`;
          const newTxn: Transaction = {
            id: txnId,
            sequenceNumber: seq,
            timestamp: new Date().toISOString(),
            type: 'MEMBER',
            category: 'Member Due',
            amount: command.amount,
            mode: command.isOnline ? 'ONLINE' : 'OFFLINE',
            status: 'ACTIVE',
            entityId: member.id,
            entityName: member.name,
            details: {
              previousYearCleared: allocation.previousYearPaid,
              monthAllocations: allocation.monthAllocations,
            },
            performedBy: `Telegram:${senderName} (${senderId})`,
          };
          await db.saveTransaction(newTxn);

          // Create Audit Log
          const audit: AuditLog = {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'CREATE',
            targetEntity: 'TRANSACTION',
            targetId: txnId,
            performedBy: `Telegram:${senderName}`,
            changes: [{ field: 'amount', oldValue: 0, newValue: command.amount }],
            reason: `Member payment for ${member.name} via Telegram Bot`,
          };
          await db.saveAuditLog(audit);

          // Recalculate remaining dues
          const duesAfter = computeMemberDues(updatedMember, season);
          const breakdownParts: string[] = [];
          if (allocation.previousYearPaid > 0) {
            breakdownParts.push(`Prev Pending cleared: ${formatINR(allocation.previousYearPaid)}`);
          }
          for (const [m, amt] of Object.entries(allocation.monthAllocations)) {
            breakdownParts.push(`${m}: ${formatINR(amt)}`);
          }

          const receipt = `✅ <b>Payment Recorded: TXN #${seq}</b>
━━━━━━━━━━━━━━━━━━━
👤 <b>Member:</b> ${member.name}
💰 <b>Amount:</b> <code>+${formatINR(command.amount)}</code> (${command.isOnline ? '📱 Online UPI' : '💵 Cash'})
📋 <b>Allocation:</b> ${breakdownParts.join(' • ') || 'Live Month'}
⚠️ <b>Remaining Due:</b> <code>${formatINR(duesAfter.totalDue)}</code>

<i>Type <code>${seq} undo</code> within anytime to reverse this record.</i>`;

          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, receipt, msg.message_id);
          return new Response('OK');
        }

        // -----------------------------------------------------------------
        // C. BUILDING & FLAT COLLECTION (<Wing> <Flat> <Amount> [O])
        // -----------------------------------------------------------------
        if (command.type === 'BUILDING_FLAT') {
          const targetWing = buildings.find(
            (b) => b.code.toUpperCase() === command.wingCode.toUpperCase()
          );

          if (!targetWing) {
            await sendTelegramMessage(
              env.TELEGRAM_BOT_TOKEN,
              chatId,
              `❌ <b>Wing "${command.wingCode}" not found!</b> Available wings: ${buildings
                .map((b) => b.code)
                .join(', ')}`,
              msg.message_id
            );
            return new Response('OK');
          }

          // Locate flat across all floors
          let matchedFlat: any = null;
          let floorIndex = -1;
          let flatIndex = -1;

          for (let fi = 0; fi < targetWing.floors.length; fi++) {
            const fl = targetWing.floors[fi];
            for (let fti = 0; fti < fl.flats.length; fti++) {
              if (fl.flats[fti].flatNo === command.flatNo) {
                matchedFlat = fl.flats[fti];
                floorIndex = fi;
                flatIndex = fti;
                break;
              }
            }
            if (matchedFlat) break;
          }

          if (!matchedFlat) {
            await sendTelegramMessage(
              env.TELEGRAM_BOT_TOKEN,
              chatId,
              `❌ <b>Flat "${command.flatNo}" not found in Wing ${targetWing.code}!</b> Please check the flat number.`,
              msg.message_id
            );
            return new Response('OK');
          }

          // Update flat in building
          const updatedWing = JSON.parse(JSON.stringify(targetWing)) as Building;
          const flatToUpdate = updatedWing.floors[floorIndex].flats[flatIndex];
          flatToUpdate.amountPaid = (flatToUpdate.amountPaid || 0) + command.amount;
          flatToUpdate.isPaid = true;
          flatToUpdate.paymentMode = command.isOnline ? 'ONLINE' : 'OFFLINE';
          flatToUpdate.updatedAt = new Date().toISOString();
          if (command.residentName && (!flatToUpdate.residentName || flatToUpdate.residentName === 'Occupant')) {
            flatToUpdate.residentName = command.residentName;
          }

          await db.saveBuilding(updatedWing);

          // Save transaction
          const seq = await db.getNextSequenceNumber();
          const txnId = `txn-${Date.now()}-${seq}`;
          const newTxn: Transaction = {
            id: txnId,
            sequenceNumber: seq,
            timestamp: new Date().toISOString(),
            type: 'BUILDING',
            category: 'Building Collection',
            amount: command.amount,
            mode: command.isOnline ? 'ONLINE' : 'OFFLINE',
            status: 'ACTIVE',
            entityId: `${targetWing.code}-${command.flatNo}`,
            entityName: `${targetWing.code} ${command.flatNo} (${flatToUpdate.residentName || 'Resident'})`,
            details: {
              wing: targetWing.code,
              flat: command.flatNo,
            },
            performedBy: `Telegram:${senderName} (${senderId})`,
          };
          await db.saveTransaction(newTxn);

          // Audit log
          await db.saveAuditLog({
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'CREATE',
            targetEntity: 'BUILDING',
            targetId: txnId,
            performedBy: `Telegram:${senderName}`,
            changes: [{ field: 'amountPaid', oldValue: matchedFlat.amountPaid, newValue: flatToUpdate.amountPaid }],
            reason: `Building collection for ${targetWing.code}-${command.flatNo}`,
          });

          const receipt = `🏢 <b>Building Collection Recorded: TXN #${seq}</b>
━━━━━━━━━━━━━━━━━━━
📍 <b>Flat:</b> Wing ${targetWing.code} — Flat ${command.flatNo}
👤 <b>Resident:</b> ${flatToUpdate.residentName || 'Resident'}
💰 <b>Amount:</b> <code>+${formatINR(command.amount)}</code> (${command.isOnline ? '📱 Online UPI' : '💵 Cash'})
🟢 <b>Status:</b> Marked PAID in Building Matrix

<i>Type <code>${seq} undo</code> anytime to reverse this entry.</i>`;

          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, receipt, msg.message_id);
          return new Response('OK');
        }

        // -----------------------------------------------------------------
        // D. GENERAL COMMUNITY CHANDA
        // -----------------------------------------------------------------
        if (command.type === 'CHANDA') {
          const seq = await db.getNextSequenceNumber();
          const txnId = `txn-${Date.now()}-${seq}`;
          const newTxn: Transaction = {
            id: txnId,
            sequenceNumber: seq,
            timestamp: new Date().toISOString(),
            type: 'CHANDA',
            category: 'General Chanda',
            amount: command.amount,
            mode: command.isOnline ? 'ONLINE' : 'OFFLINE',
            status: 'ACTIVE',
            entityId: `chanda-${Date.now()}`,
            entityName: command.donorName,
            performedBy: `Telegram:${senderName} (${senderId})`,
          };
          await db.saveTransaction(newTxn);

          await db.saveAuditLog({
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'CREATE',
            targetEntity: 'TRANSACTION',
            targetId: txnId,
            performedBy: `Telegram:${senderName}`,
            changes: [{ field: 'amount', oldValue: 0, newValue: command.amount }],
            reason: `General Chanda from ${command.donorName}`,
          });

          const receipt = `🌸 <b>General Chanda Logged: TXN #${seq}</b>
━━━━━━━━━━━━━━━━━━━
🙏 <b>Donor:</b> ${command.donorName}
💰 <b>Amount:</b> <code>+${formatINR(command.amount)}</code> (${command.isOnline ? '📱 Online UPI' : '💵 Cash'})
🏷️ <b>Category:</b> Community Chanda / Voluntary

<i>Type <code>${seq} undo</code> anytime to reverse.</i>`;

          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, receipt, msg.message_id);
          return new Response('OK');
        }

        // -----------------------------------------------------------------
        // E. EXPENSE ENTRY (- <Amount> <Item> [O])
        // -----------------------------------------------------------------
        if (command.type === 'EXPENSE') {
          const seq = await db.getNextSequenceNumber();
          const txnId = `txn-${Date.now()}-${seq}`;
          const newTxn: Transaction = {
            id: txnId,
            sequenceNumber: seq,
            timestamp: new Date().toISOString(),
            type: 'EXPENSE',
            category: 'Expenditure',
            amount: command.amount,
            mode: command.isOnline ? 'ONLINE' : 'OFFLINE',
            status: 'ACTIVE',
            entityId: `exp-${Date.now()}`,
            entityName: command.description,
            details: {
              expensePurpose: command.description,
            },
            performedBy: `Telegram:${senderName} (${senderId})`,
          };
          await db.saveTransaction(newTxn);

          await db.saveAuditLog({
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'CREATE',
            targetEntity: 'TRANSACTION',
            targetId: txnId,
            performedBy: `Telegram:${senderName}`,
            changes: [{ field: 'amount', oldValue: 0, newValue: command.amount }],
            reason: `Expenditure for ${command.description}`,
          });

          const receipt = `💸 <b>Expense Recorded: TXN #${seq}</b>
━━━━━━━━━━━━━━━━━━━
📝 <b>Item/Purpose:</b> ${command.description}
💰 <b>Amount:</b> <code>-${formatINR(command.amount)}</code> (${command.isOnline ? '📱 Online UPI' : '💵 Cash Outflow'})
📉 <b>Deduction:</b> Subtracted from Mandal Balance

<i>Type <code>${seq} undo</code> anytime to reverse.</i>`;

          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, receipt, msg.message_id);
          return new Response('OK');
        }

        // -----------------------------------------------------------------
        // F. TRANSACTION REVERSAL (<seqNo> undo)
        // -----------------------------------------------------------------
        if (command.type === 'UNDO') {
          const txns = await db.getTransactions(200);
          const targetTxn = txns.find((t) => t.sequenceNumber === command.sequenceNumber);

          if (!targetTxn) {
            await sendTelegramMessage(
              env.TELEGRAM_BOT_TOKEN,
              chatId,
              `❌ Transaction <b>#${command.sequenceNumber}</b> not found in database.`,
              msg.message_id
            );
            return new Response('OK');
          }

          if (targetTxn.status === 'REVERSED') {
            await sendTelegramMessage(
              env.TELEGRAM_BOT_TOKEN,
              chatId,
              `⚠️ Transaction <b>#${command.sequenceNumber}</b> is ALREADY reversed.`,
              msg.message_id
            );
            return new Response('OK');
          }

          // Mark transaction as REVERSED (non-destructive write as per Agent-rules.md §1)
          const updatedTxn: Transaction = {
            ...targetTxn,
            status: 'REVERSED',
          };
          await db.saveTransaction(updatedTxn);

          // If member transaction: reverse allocation
          if (targetTxn.type === 'MEMBER') {
            const member = members.find((m) => m.id === targetTxn.entityId);
            if (member) {
              const updatedPayments = { ...(member.payments || {}) };
              const monthAllocations = targetTxn.details?.monthAllocations || {};
              for (const [m, amt] of Object.entries(monthAllocations)) {
                updatedPayments[m] = Math.max(0, (updatedPayments[m] || 0) - amt);
              }
              const restoredPrevPending =
                (member.previousYearPending || 0) + (targetTxn.details?.previousYearCleared || 0);

              await db.saveMember({
                ...member,
                previousYearPending: restoredPrevPending,
                payments: updatedPayments,
              });
            }
          }

          // If building flat transaction: revert flat payment
          if (targetTxn.type === 'BUILDING' && targetTxn.details?.wing && targetTxn.details?.flat) {
            const wing = buildings.find((b) => b.code === targetTxn.details?.wing);
            if (wing) {
              const updatedWing = JSON.parse(JSON.stringify(wing)) as Building;
              for (const fl of updatedWing.floors) {
                for (const flat of fl.flats) {
                  if (flat.flatNo === targetTxn.details?.flat) {
                    flat.amountPaid = Math.max(0, (flat.amountPaid || 0) - targetTxn.amount);
                    flat.isPaid = flat.amountPaid > 0;
                    break;
                  }
                }
              }
              await db.saveBuilding(updatedWing);
            }
          }

          // Create audit log for reversal
          await db.saveAuditLog({
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'UNDO',
            targetEntity: 'TRANSACTION',
            targetId: targetTxn.id,
            performedBy: `Telegram:${senderName}`,
            changes: [{ field: 'status', oldValue: 'ACTIVE', newValue: 'REVERSED' }],
            reason: `Undo requested via Telegram Bot for TXN #${targetTxn.sequenceNumber}`,
          });

          const msgText = `↩️ <b>Transaction Reversal Confirmed</b>
━━━━━━━━━━━━━━━━━━━
🚫 <b>Voided:</b> TXN #${targetTxn.sequenceNumber}
👤 <b>Entity:</b> ${targetTxn.entityName}
💰 <b>Amount:</b> ${targetTxn.type === 'EXPENSE' ? '-' : '+'}${formatINR(targetTxn.amount)} (${targetTxn.mode})
🟢 <b>Status:</b> Marked REVERSED in Firestore &amp; Ledger balances updated.`;

          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, msgText, msg.message_id);
          return new Response('OK');
        }

        // -----------------------------------------------------------------
        // G. MEMBER QUICK LOOKUP (<Name>)
        // -----------------------------------------------------------------
        if (command.type === 'MEMBER_LOOKUP') {
          const member = members.find(
            (m) => m.name.toLowerCase() === command.memberName.toLowerCase()
          );
          if (member) {
            const dues = computeMemberDues(member, season);
            const resp = `👤 <b>Member Record: ${member.name}</b>
━━━━━━━━━━━━━━━━━━━
💵 <b>Total Paid (YTD):</b> <code>${formatINR(dues.currentSeasonPaid)}</code>
⚠️ <b>Current Outstanding Due:</b> <code>${formatINR(dues.totalDue)}</code>
${dues.previousYearPending > 0 ? `├ <i>Previous Debt:</i> ${formatINR(dues.previousYearPending)}\n` : ''}└ <i>Live Month (${season.liveMonth}):</i> ${formatINR(dues.currentSeasonDue)}

<i>To record payment: <code>${member.name} &lt;Amount&gt; [O]</code></i>`;
            await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, resp, msg.message_id);
            return new Response('OK');
          }
        }

        // -----------------------------------------------------------------
        // H. INVALID COMMAND
        // -----------------------------------------------------------------
        if (command.type === 'INVALID') {
          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, command.error, msg.message_id);
          return new Response('OK');
        }

        return new Response('OK');
      } catch (err: any) {
        console.error('Error processing Telegram webhook:', err);
        await sendTelegramMessage(
          env.TELEGRAM_BOT_TOKEN,
          chatId,
          `⚠️ <b>System Error:</b> Could not process entry: ${err.message || 'Unknown error'}. Please try again.`,
          msg.message_id
        );
        return new Response('OK');
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
