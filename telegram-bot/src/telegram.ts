export async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  htmlText: string,
  replyToMessageId?: number
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const payload: any = {
      chat_id: chatId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      console.error('Telegram sendMessage error:', await resp.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
    return false;
  }
}

/**
 * Generates the Command Menu and Help guide (/9 or /help).
 */
export function getHelpMessage(): string {
  return `<b>🚩 Siyaram Finance Bot — Command Reference</b>

<b>⚡ Quick Field Entries:</b>
• <code>&lt;Name&gt; &lt;Amount&gt; [O]</code>
  ↳ <i>Member collection (Cash or UPI)</i>
  <i>Examples:</i> <code>Rahul 200</code> | <code>Piyush 150 O</code>

• <code>&lt;Wing&gt; &lt;Flat&gt; &lt;Amount&gt; [O]</code>
  ↳ <i>Building Flat collection</i>
  <i>Examples:</i> <code>A 101 500</code> | <code>Rahul A 001 200 O</code>

• <code>- &lt;Amount&gt; &lt;Description&gt; [O]</code>
  ↳ <i>Expenditure (Kharcha)</i>
  <i>Examples:</i> <code>- 500 Lights</code> | <code>- 191 Tape O</code>

• <code>&lt;ID&gt; undo</code>
  ↳ <i>Immediate Reversal / Undo</i>
  <i>Examples:</i> <code>3 undo</code> | <code>105 undo</code>

• <code>&lt;Name&gt;</code>
  ↳ <i>Quick Member lookup (Paid &amp; Dues)</i>
  <i>Example:</i> <code>Rahul</code>

<b>📊 Slash Commands:</b>
/1 — <b>Finance Summary</b> (Cash, Online, Balance)
/2 — <b>Member Dues List</b> (Sorted descending)
/3 — <b>Offline Inflows</b> (Cash Collections)
/4 — <b>Offline Expenses</b> (Cash Kharcha)
/5 — <b>Online Inflows</b> (UPI Collections)
/6 — <b>Online Expenses</b> (UPI Kharcha)
/7 — <b>Combined Income Ledger</b>
/8 — <b>Combined Expense Ledger</b>
/9 — <b>This Help Menu</b>

<i>Note: Standalone <code>O</code> at the end marks an Online UPI payment.</i>`;
}
