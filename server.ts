import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

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

// Endpoint: Análise visual da mesa de poker
app.post('/api/poker/analyze', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Chave GEMINI_API_KEY não configurada no Render.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `Você é um especialista em visão computacional e poker Texas Hold'em.
Analise esta foto de mesa de poker e extraia em JSON:
1. hero_hand: Array com as 2 cartas do jogador (ex: ["As", "Kd"]). Ranks: 2-9, T, J, Q, K, A. Naipes: s, h, d, c.
2. board: Array com cartas comunitárias no centro (0 a 5 cartas).
3. stage: "preflop", "flop", "turn" ou "river".
4. position: "UTG", "MP", "CO", "BTN", "SB", "BB" ou null.
5. effective_stack_bb: número inteiro de BBs ou null.
6. active_villains: número de vilões ou null.
7. action_to_hero: "unopened", "limp", "raise", "3bet" ou null.
8. confidence_summary: resumo curto em português do que viu.`;

    // Timeout de 15 segundos para nunca travar a requisição
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tempo limite excedido na análise do Gemini (timeout de 15s).')), 15000)
    );

    const apiPromise = aiClient.models.generateContent({
      model: 'models/gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hero_hand: { type: Type.ARRAY, items: { type: Type.STRING } },
            board: { type: Type.ARRAY, items: { type: Type.STRING } },
            stage: { type: Type.STRING },
            position: { type: Type.STRING },
            effective_stack_bb: { type: Type.NUMBER },
            active_villains: { type: Type.NUMBER },
            action_to_hero: { type: Type.STRING },
            confidence_summary: { type: Type.STRING },
          },
          required: ['hero_hand', 'board', 'stage'],
        },
      },
    });

    const response: any = await Promise.race([apiPromise, timeoutPromise]);
    const rawText = response?.text || '{}';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson || '{}');

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
        hero_hand: (parsed.hero_hand && parsed.hero_hand.length === 2) ? 0.95 : 0.4,
        board: 0.95,
        position: parsed.position ? 0.85 : 0.0,
        effective_stack_bb: parsed.effective_stack_bb ? 0.8 : 0.0,
        active_villains: parsed.active_villains ? 0.8 : 0.0,
        action_to_hero: parsed.action_to_hero ? 0.85 : 0.0,
        summary: parsed.confidence_summary || 'Leitura da mesa concluída.',
      },
    };

    return res.json(sanitized);
  } catch (error: any) {
    console.error('Error analyzing table image with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao processar imagem.',
    });
  }
});

// Endpoint: Análise tática
app.post('/api/poker/strategic-advice', async (req: Request, res: Response) => {
  try {
    const { hero_hand, board, stage, position, effective_stack_bb, active_villains, action_to_hero } = req.body;
    if (!aiClient) return res.status(503).json({ error: 'Gemini não configurado.' });

    const promptText = `Coach GTO Texas Hold'em. Spot:
Hero: ${Array.isArray(hero_hand) ? hero_hand.join(' ') : 'Desconhecida'} | Board: ${Array.isArray(board) ? board.join(' ') : 'Preflop'} | Estágio: ${stage} | Posição: ${position || 'BTN'} | Stack: ${effective_stack_bb || 40} BB | Vilões: ${active_villains || 1} | Ação: ${action_to_hero || 'unopened'}.
Retorne JSON com: main_line, sizing_advice, gto_rationale, exploits_and_traps, next_street_plan.`;

    const response = await aiClient.models.generateContent({
      model: 'models/gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
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
