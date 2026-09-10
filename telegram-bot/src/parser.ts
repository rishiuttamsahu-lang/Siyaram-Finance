import type { ParsedCommand, Member, Building } from './types.ts';

/**
 * Normalizes strings by trimming and collapsing multiple whitespace characters.
 */
export function normalize(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Checks if string is a valid positive number.
 */
function parsePositiveAmount(token: string): number | null {
  // Strip currency symbols if user typed ₹200 or Rs200
  const clean = token.replace(/^[₹$]|rs\.?/i, '');
  const num = Number(clean);
  if (!isNaN(num) && num > 0 && Number.isFinite(num)) {
    return Math.round(num); // Ensure integer rupee values
  }
  return null;
}

/**
 * Parses natural telegram messages into structured command intents.
 * Strictly adheres to Agent-rules.md:
 * 1. Positional 'O' rule: only the last standalone token 'O' triggers Online UPI.
 * 2. Case-insensitive exact member name matching.
 * 3. Fail-loud building/flat resolution.
 */
export function parseTelegramMessage(
  rawText: string,
  members: Member[] = [],
  buildings: Building[] = []
): ParsedCommand {
  const text = normalize(rawText);
  if (!text) {
    return { type: 'INVALID', error: 'Empty message received.' };
  }

  // -------------------------------------------------------------
  // 1. SLASH COMMANDS (/1 to /9, /summary, /dues, /help, /start)
  // -------------------------------------------------------------
  if (text.startsWith('/')) {
    const parts = text.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    // Map common aliases
    let mapped = cmd;
    if (cmd === '/summary') mapped = '/1';
    else if (cmd === '/dues') mapped = '/2';
    else if (cmd === '/help' || cmd === '/start') mapped = '/9';

    return { type: 'SLASH_COMMAND', command: mapped, arg: arg || undefined };
  }

  // -------------------------------------------------------------
  // 2. TRANSACTION REVERSAL (<id> undo e.g. "3 undo", "105 undo")
  // -------------------------------------------------------------
  const undoMatch = text.match(/^#?(\d+)\s+undo$/i);
  if (undoMatch) {
    const seq = parseInt(undoMatch[1], 10);
    if (seq > 0) {
      return { type: 'UNDO', sequenceNumber: seq };
    }
  }

  // -------------------------------------------------------------
  // 3. POSITIONAL ONLINE 'O' RULE
  // Rule: 'O' is ONLY an online flag if it is the standalone final token.
  // -------------------------------------------------------------
  let tokens = text.split(' ');
  let isOnline = false;

  if (tokens.length > 1 && tokens[tokens.length - 1].toUpperCase() === 'O') {
    isOnline = true;
    tokens = tokens.slice(0, -1); // Remove trailing 'O'
  }

  // -------------------------------------------------------------
  // 4. EXPENSE ENTRY (Starts with leading '-')
  // Format: - <Amount> <Item/Purpose> [O]
  // e.g. "- 500 Decoration", "- 191 StripLight O", "- 500 Oil"
  // -------------------------------------------------------------
  if (tokens[0].startsWith('-') || tokens[0] === '—' || tokens[0] === '–') {
    let remainderTokens = [...tokens];
    if (remainderTokens[0] === '-' || remainderTokens[0] === '—' || remainderTokens[0] === '–') {
      remainderTokens.shift(); // removed standalone '-'
    } else {
      remainderTokens[0] = remainderTokens[0].substring(1); // removed leading '-'
    }

    if (remainderTokens.length < 2) {
      return {
        type: 'INVALID',
        error: 'Invalid expense syntax. Format: <code>- &lt;Amount&gt; &lt;Description&gt; [O]</code>\nExample: <code>- 500 Lights</code> or <code>- 191 Tape O</code>',
      };
    }

    const amount = parsePositiveAmount(remainderTokens[0]);
    if (!amount) {
      return {
        type: 'INVALID',
        error: `Invalid expense amount: "${remainderTokens[0]}". Must be a valid number.\nExample: <code>- 500 Decoration</code>`,
      };
    }

    const description = remainderTokens.slice(1).join(' ').trim();
    if (!description) {
      return {
        type: 'INVALID',
        error: 'Expense description missing. Example: <code>- 500 Sound System</code>',
      };
    }

    return {
      type: 'EXPENSE',
      amount,
      description,
      isOnline,
    };
  }

  // -------------------------------------------------------------
  // 5. BUILDING & FLAT COLLECTION
  // Formats:
  // - "<Wing> <Flat> <Amount> [O]" (e.g. "A 101 200", "A 001 500 O")
  // - "<Name> <Wing> <Flat> <Amount> [O]" (e.g. "Rahul A 001 500")
  // - "<Wing>-<Flat> <Amount> [O]" (e.g. "A-101 200")
  // -------------------------------------------------------------
  // Check known building codes (e.g. 'A', 'B', 'C')
  const buildingCodes = new Set(
    buildings.map((b) => b.code.toUpperCase()).concat(['A', 'B', 'C', 'D', 'E', 'F'])
  );

  // Case A: tokens = [Wing, Flat, Amount]
  if (tokens.length >= 3) {
    // Check if tokens[0] is Wing code and tokens[1] looks like flat number (e.g. "A 101 500")
    if (buildingCodes.has(tokens[0].toUpperCase()) && /^\d{1,4}[A-Z]?$/i.test(tokens[1])) {
      const amount = parsePositiveAmount(tokens[2]);
      if (amount) {
        return {
          type: 'BUILDING_FLAT',
          wingCode: tokens[0].toUpperCase(),
          flatNo: tokens[1].padStart(3, '0'),
          amount,
          isOnline,
        };
      }
    }

    // Check if tokens[1] is Wing code and tokens[2] is flat (e.g. "Rahul A 001 500")
    if (buildingCodes.has(tokens[1].toUpperCase()) && /^\d{1,4}[A-Z]?$/i.test(tokens[2])) {
      const amount = tokens.length >= 4 ? parsePositiveAmount(tokens[3]) : null;
      if (amount) {
        return {
          type: 'BUILDING_FLAT',
          wingCode: tokens[1].toUpperCase(),
          flatNo: tokens[2].padStart(3, '0'),
          residentName: tokens[0],
          amount,
          isOnline,
        };
      }
    }
  }

  // Case B: Hyphenated Wing-Flat (e.g. "A-101 500")
  if (tokens.length >= 2) {
    const hyphenMatch = tokens[0].match(/^([A-Z])-?(\d{1,4}[A-Z]?)$/i);
    if (hyphenMatch && buildingCodes.has(hyphenMatch[1].toUpperCase())) {
      const amount = parsePositiveAmount(tokens[1]);
      if (amount) {
        return {
          type: 'BUILDING_FLAT',
          wingCode: hyphenMatch[1].toUpperCase(),
          flatNo: hyphenMatch[2].padStart(3, '0'),
          amount,
          isOnline,
        };
      }
    }
  }

  // -------------------------------------------------------------
  // 6. MEMBER CONTRIBUTION OR GENERAL CHANDA
  // Format: <Name> <Amount> [O]
  // e.g. "Rahul 200", "Piyush 150 O", "SumitKirana 101"
  // -------------------------------------------------------------
  if (tokens.length >= 2) {
    const lastToken = tokens[tokens.length - 1];
    const amount = parsePositiveAmount(lastToken);

    if (amount) {
      const name = tokens.slice(0, -1).join(' ').trim();
      const normName = name.toLowerCase();

      // Check if name matches any registered member (case-insensitive exact)
      const matchedMember = members.find(
        (m) => m.name.trim().toLowerCase() === normName
      );

      if (matchedMember) {
        return {
          type: 'MEMBER_PAYMENT',
          memberName: matchedMember.name,
          amount,
          isOnline,
        };
      }

      // If user typed "Chanda 500 [Donor]":
      if (normName.startsWith('chanda') || normName.startsWith('donation')) {
        const donorName = name.replace(/^(chanda|donation)\s*/i, '').trim() || 'General Donor';
        return {
          type: 'CHANDA',
          donorName,
          amount,
          isOnline,
        };
      }

      // If name does not match member, it is treated as Extra / General Chanda
      return {
        type: 'CHANDA',
        donorName: name,
        amount,
        isOnline,
      };
    }
  }

  // -------------------------------------------------------------
  // 7. SINGLE-WORD MEMBER LOOKUP (e.g. "Rahul", "Piyush")
  // -------------------------------------------------------------
  if (tokens.length === 1 && isNaN(Number(tokens[0]))) {
    const searchName = tokens[0].toLowerCase();
    const matched = members.find((m) => m.name.toLowerCase() === searchName);
    if (matched) {
      return { type: 'MEMBER_LOOKUP', memberName: matched.name };
    }
  }

  // Fallback unrecognized syntax
  return {
    type: 'INVALID',
    error: `Unrecognized command: "<code>${text}</code>".\n\n<b>Quick Formats:</b>\n• <code>Rahul 200</code> (Cash)\n• <code>Rahul 200 O</code> (UPI)\n• <code>A 101 500</code> (Flat collection)\n• <code>- 500 Lights</code> (Expense)\n• <code>3 undo</code> (Reversal)\n• <code>/1</code> (Finance Summary)\n• <code>/9</code> (All Commands)`,
  };
}
