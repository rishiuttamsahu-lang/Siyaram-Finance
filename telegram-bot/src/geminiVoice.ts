import type { Env, Member, Building } from './types.ts';

const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

export interface VoiceProcessResult {
  transcription: string;
  commandText: string;
  replyMessage?: string;
  modelUsed?: string;
}

/**
 * Downloads voice note audio from Telegram Bot API
 */
export async function downloadTelegramVoiceAudio(
  botToken: string,
  fileId: string
): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  // 1. Get file path
  const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`;
  const getFileRes = await fetch(getFileUrl);
  if (!getFileRes.ok) {
    throw new Error(`Failed to getFile from Telegram API: ${getFileRes.status} ${await getFileRes.text()}`);
  }
  const fileData = (await getFileRes.json()) as { ok: boolean; result?: { file_path?: string; file_size?: number } };
  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error(`Telegram API did not return file_path for fileId: ${fileId}`);
  }

  const filePath = fileData.result.file_path;

  // 2. Download audio file binary
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const downloadRes = await fetch(downloadUrl);
  if (!downloadRes.ok) {
    throw new Error(`Failed to download audio file from Telegram: ${downloadRes.status}`);
  }

  const buffer = await downloadRes.arrayBuffer();
  // Telegram voice notes are Ogg Opus
  const mimeType = 'audio/ogg';
  return { buffer, mimeType };
}

/**
 * Converts ArrayBuffer to Base64 in chunks (Cloudflare Worker safe)
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Executes Gemini generateContent call with structured response
 */
async function callGeminiModel(
  model: string,
  apiKey: string,
  audioBase64: string,
  mimeType: string,
  systemPrompt: string
): Promise<VoiceProcessResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: 'Listen to this voice message carefully. Transcribe what was said and map it to the Siyaram Finance Bot command or query.',
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API ${model} failed (${response.status}): ${errText}`);
  }

  const result = (await response.json()) as any;
  const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    throw new Error(`Gemini API ${model} returned empty candidate text.`);
  }

  const parsed = JSON.parse(candidateText.trim());
  return {
    transcription: parsed.transcription || '',
    commandText: parsed.commandText || '',
    replyMessage: parsed.replyMessage || '',
    modelUsed: model,
  };
}

/**
 * Process voice note using 1st priority Gemini 3.1 Flash-Lite,
 * falling back to Gemini 3.5 Flash-Lite if necessary.
 */
export async function processVoiceWithGemini(
  env: Env,
  audioBase64: string,
  mimeType: string,
  members: Member[],
  buildings: Building[]
): Promise<VoiceProcessResult> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment bindings. Run `wrangler secret put GEMINI_API_KEY` to configure.');
  }

  const memberNamesList = members.map((m) => m.name.toUpperCase()).join(', ');
  const buildingNamesList = buildings.map((b) => `${b.name} (Code: ${b.code})`).join(', ');

  const systemPrompt = `You are the intelligent voice recognition engine for "Siyaram Finance Telegram Bot" (Ganesh Mandal Ledger).
The user is speaking into a Telegram voice note. They may speak in Hindi, Hinglish, Marathi, English, or colloquial street language (e.g. "Arey sun", "hisaab likh", "jama hua", "pachas", "sau", "hazar", "online bheja", "cash diya").

Your job:
1. Accurately transcribe what the user said into "transcription".
2. Determine their financial ledger intent and output the exact canonical "commandText".

KNOWN ACTIVE MEMBERS:
${memberNamesList || 'PIYUSH, AYUSH.S, PANKAJ, PAVAN, AMAN, RISHI, ARYAN, SHARAVAN'}

KNOWN BUILDINGS:
${buildingNamesList || 'General Chanda'}

BOT SYNTAX RULES:
A. Information Queries:
- Mandal Summary / Balance / Total -> "/summary"
- Member Dues / Pending / Baki hisaab -> "/dues"
- Incomes / Latest collections -> "/income"
- Expenses / Kharcha list -> "/expenses"
- Online Wallet / UPI Pool -> "/online"
- Google Sheet / Excel link -> "/sheet"
- Undo / Cancel last entry / Galat entry -> "/undo"
- Help / Commands info -> "/help"

B. Member Payment (Chanda from Mandal Member):
Format: <MEMBER_NAME> <AMOUNT> <Cash|Online>
Example:
- Spoken: "Piyush ne 500 cash diya" -> "PIYUSH 500 Cash"
- Spoken: "Ayush ka teen sau rupaye online gpay aaya" -> "AYUSH.S 300 Online"
- Spoken: "Rishi do sau online" -> "RISHI 200 Online"

C. Expense (Mandal Kharcha):
Format: Expense <Category/Purpose> <AMOUNT> <Cash|Online>
Example:
- Spoken: "Flower ke liye 350 rupaye cash kharch huye" -> "Expense Flower 350 Cash"
- Spoken: "Prasad ka 1200 upi kiya" -> "Expense Prasad 1200 Online"
- Spoken: "Chai nashta 150 cash" -> "Expense Tea 150 Cash"

D. Building / Outside Chanda:
Format: <Building/Person> <FlatNo?> <AMOUNT> <Cash|Online>
Example:
- Spoken: "Shivcut room 101 ne 150 online diya" -> "Shivcut 101 150 Online"
- Spoken: "Kesarvani 501 cash" -> "Kesarvani 501 Cash"

CRITICAL INSTRUCTIONS:
- If payment mode is not mentioned, default to "Cash".
- If spoken name closely matches a known member (e.g., "Piyush", "Pankaj", "Sharavan"), use their exact registered name from the KNOWN ACTIVE MEMBERS list.
- If the user says something completely unrelated to finance or audio is silent/inaudible, set "commandText": "".

Return ONLY valid JSON matching this schema:
{
  "transcription": "exact transcription in original language/script or latin",
  "commandText": "canonical command or empty string if not a finance command",
  "replyMessage": "short friendly confirmation in Hinglish"
}`;

  // 1st Priority: gemini-3.1-flash-lite
  try {
    const result = await callGeminiModel(PRIMARY_MODEL, apiKey, audioBase64, mimeType, systemPrompt);
    return result;
  } catch (primaryErr: any) {
    console.warn(`Primary model ${PRIMARY_MODEL} failed, trying fallback ${FALLBACK_MODEL}:`, primaryErr.message);

    // 2nd Priority (Fallback): gemini-3.5-flash-lite
    try {
      const fallbackResult = await callGeminiModel(FALLBACK_MODEL, apiKey, audioBase64, mimeType, systemPrompt);
      return fallbackResult;
    } catch (fallbackErr: any) {
      console.error(`Both Gemini models failed:`, fallbackErr);
      throw new Error(`Voice transcription failed: ${fallbackErr.message}`);
    }
  }
}
