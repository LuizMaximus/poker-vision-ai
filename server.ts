import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint de visão computacional ultrarrápido
app.post('/api/poker/analyze', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
    }

    if (!aiClient) {
      return res.status(503).json({ error: 'GEMINI_API_KEY não configurada.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `Você é um scanner de mesa de Texas Hold'em. Responda APENAS um JSON válido no formato:
{
  "hero_hand": ["As", "Kd"],
  "board": ["Qh", "Jd", "2s"],
  "stage": "flop",
  "position": "BTN",
  "effective_stack_bb": 40,
  "active_villains": 1,
  "action_to_hero": "unopened",
  "confidence_summary": "Hero: As Kd | Board: Qh Jd 2s"
}
Regras:
- hero_hand: 2 cartas do jogador. board: cartas no centro (0 no preflop, 3 flop, 4 turn, 5 river).
- Ranks: 2-9, T, J, Q, K, A. Naipes: s, h, d, c. Se ilegível use [].
- stage: "preflop"|"flop"|"turn"|"river". position: "UTG"|"MP"|"CO"|"BTN"|"SB"|"BB"|null.`;

    // Timeout de corte em 12 segundos
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tempo limite de 12s excedido.')), 12000)
    );

    const apiPromise = aiClient.models.generateContent({
      model: 'models/gemini-3.8-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1, // temperatura baixa = resposta quase instantânea e determinística
      },
    });

    const response: any = await Promise.race([apiPromise, timeoutPromise]);
    const rawText = response?.text || '{}';
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsed: any = {};
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {};
    }

    const validPositions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
    const validStages = ['preflop', 'flop', 'turn', 'river'];
    const validActions = ['unopened', 'limp', 'raise', '3bet'];

    const sanitized = {
      hero_hand: Array.isArray(parsed.hero_hand) ? parsed.hero_hand : [],
      board: Array.isArray(parsed.board) ? parsed.board : [],
      stage: validStages.includes(parsed.stage?.toLowerCase()) ? parsed.stage.toLowerCase() : 'preflop',
      position: validPositions.includes(parsed.position?.toUpperCase()) ? parsed.position.toUpperCase() : null,
      effective_stack_bb: typeof parsed.effective_stack_bb === 'number' && parsed.effective_stack_bb > 0 ? Math.round(parsed.effective_stack_bb) : null,
      active_villains: typeof parsed.active_villains === 'number' && parsed.active_villains > 0 ? Math.round(parsed.active_villains) : null,
      action_to_hero: validActions.includes(parsed.action_to_hero?.toLowerCase()) ? parsed.action_to_hero.toLowerCase() : null,
      confidence: {
        hero_hand: (parsed.hero_hand && parsed.hero_hand.length === 2) ? 0.98 : 0.4,
        board: 0.98,
        position: parsed.position ? 0.9 : 0.0,
        effective_stack_bb: parsed.effective_stack_bb ? 0.85 : 0.0,
        active_villains: parsed.active_villains ? 0.85 : 0.0,
        action_to_hero: parsed.action_to_hero ? 0.9 : 0.0,
        summary: parsed.confidence_summary || 'Mesa escaneada com sucesso.',
      },
    };

    return res.json(sanitized);
  } catch (error: any) {
    console.error('Error analyzing table image:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao processar imagem.',
    });
  }
});

// Endpoint de análise tática
app.post('/api/poker/strategic-advice', async (req: Request, res: Response) => {
  try {
    const { hero_hand, board, stage, position, effective_stack_bb, active_villains, action_to_hero } = req.body;
    if (!aiClient) return res.status(503).json({ error: 'Gemini não configurado.' });

    const promptText = `Coach GTO Texas Hold'em. Responda SOMENTE JSON com: main_line, sizing_advice, gto_rationale, exploits_and_traps, next_street_plan.
Spot: Hero: ${Array.isArray(hero_hand) ? hero_hand.join(' ') : '?'} | Board: ${Array.isArray(board) ? board.join(' ') : 'Preflop'} | Estágio: ${stage} | Posição: ${position || 'BTN'} | Stack: ${effective_stack_bb || 40}BB | Vilões: ${active_villains || 1} | Ação: ${action_to_hero || 'unopened'}.`;

    const response = await aiClient.models.generateContent({
      model: 'models/gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse((response.text || '{}').replace(/```json/gi, '').replace(/```/g, '').trim());
    return res.json(parsed);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erro no conselho.' });
  }
});

async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Poker Vision AI server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
