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

// Server-side Gemini client
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

// Endpoint: Multimodal Vision extraction for Poker Table
app.post('/api/poker/analyze', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Chave GEMINI_API_KEY não configurada no servidor. Por favor verifique o painel Secrets.',
      });
    }

    // Clean base64 header if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `
Você é o mais avançado especialista em visão computacional e teoria de jogos (GTO) para Texas Hold'em (Poker Vision AI).
Analise detalhadamente esta imagem de uma mesa de poker (física ao vivo ou online) e extraia os elementos chave do jogo com a máxima precisão:

1. hero_hand: As 2 cartas na mão do jogador / Hero (normalmente em primeiro plano, na parte inferior da tela ou voltadas para o jogador). Ex: ["Ad", "Ac"] ou ["Kh", "Ts"] ou ["7c", "2d"]. Ranks válidos: 2, 3, 4, 5, 6, 7, 8, 9, T (para 10), J, Q, K, A. Naipes: s (espadas), h (copas), d (ouros), c (paus). Se não conseguir ler com clareza, retorne lista vazia [].
2. board: As cartas comunitárias no centro da mesa (Flop = 3 cartas, Turn = 4 cartas, River = 5 cartas). Se for pré-flop (sem mesa), retorne [].
3. stage: Estágio da mão: "preflop" (0 cartas na mesa), "flop" (3 cartas na mesa), "turn" (4 cartas na mesa) ou "river" (5 cartas na mesa).
4. position: Posição estimada do Hero na mesa considerando o botão do dealer ('D' ou puck branco): "UTG", "MP", "CO", "BTN", "SB", "BB". Se não puder determinar com certeza absoluta, retorne null.
5. effective_stack_bb: Tamanho do stack efetivo visível em Big Blinds (número inteiro, ex: 10, 25, 50, 100). Se não for legível ou numérico, retorne null.
6. active_villains: Quantidade de oponentes ainda ativos na mão com cartas (ex: 1, 2, 3). Se não for claro, retorne null.
7. action_to_hero: Ação prévia observada antes de chegar no Hero: "unopened" (ninguém apostou, mesa em fold), "limp" (pagaram big blind), "raise" (houve aumento simples), "3bet" (houve re-aumento). Se não for claro, retorne null.
8. confidence_summary: Breve resumo em português explicando o que foi detectado com clareza e o que precisa de confirmação rápida do jogador.
`;

    const response = await aiClient.models.generateContent({
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
            hero_hand: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Cartas do Hero (ex: ["As", "Kd"])',
            },
            board: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Cartas comunitárias do board (ex: ["Qh", "Jd", "2s"])',
            },
            stage: {
              type: Type.STRING,
              description: 'Estágio do jogo: preflop, flop, turn ou river',
            },
            position: {
              type: Type.STRING,
              description: 'Posição do Hero (UTG, MP, CO, BTN, SB, BB ou null)',
            },
            effective_stack_bb: {
              type: Type.NUMBER,
              description: 'Stack visível em BBs ou null',
            },
            active_villains: {
              type: Type.NUMBER,
              description: 'Número de vilões ativos ou null',
            },
            action_to_hero: {
              type: Type.STRING,
              description: 'Ação prévia observada (unopened, limp, raise, 3bet ou null)',
            },
            confidence_summary: {
              type: Type.STRING,
              description: 'Resumo das detecções e nível de confiança',
            },
          },
          required: ['hero_hand', 'board', 'stage'],
        },
      },
    });

    const textOutput = response.text || '{}';
    const parsed = JSON.parse(textOutput);

    // Sanitize position & stage
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
        summary: parsed.confidence_summary || 'Detecção processada com sucesso.',
      },
    };

    return res.json(sanitized);
  } catch (error: any) {
    console.error('Error analyzing table image with Gemini:', error);
    return res.status(500).json({
      error: 'Falha ao processar imagem com Gemini Vision.',
      details: error?.message || 'Erro desconhecido',
    });
  }
});

// Endpoint: Deep strategic analysis powered by Gemini Flash
app.post('/api/poker/strategic-advice', async (req: Request, res: Response) => {
  try {
    const { hero_hand, board, stage, position, effective_stack_bb, active_villains, action_to_hero } = req.body;

    if (!aiClient) {
      return res.status(503).json({ error: 'Gemini client não configurado.' });
    }

    const promptText = `
Você é um treinador de Poker High Stakes e autoridade em GTO (Game Theory Optimal) Texas Hold'em.
Forneça uma análise estratégica avançada, concisa e de alto impacto para o seguinte spot:

- Mão do Hero: ${Array.isArray(hero_hand) ? hero_hand.join(' ') : 'Desconhecida'}
- Mesa (Board): ${Array.isArray(board) && board.length > 0 ? board.join(' ') : 'Nenhum (Pré-flop)'}
- Estágio: ${stage}
- Posição do Hero: ${position || 'BTN (presumido)'}
- Stack Efetivo: ${effective_stack_bb || 40} BBs
- Vilões Ativos: ${active_villains || 1}
- Ação Prévia: ${action_to_hero || 'unopened'}

Responda em português com formato JSON estruturado com os seguintes campos:
1. main_line: Ação recomendada primária (FOLD, CHECK, CALL, RAISE ou ALL-IN).
2. sizing_advice: Tamanho exato recomendado de aposta/raise.
3. gto_rationale: Justificativa técnica baseada em ranges, vantagem de equidade e polarização (2 a 3 frases densas).
4. exploits_and_traps: Possíveis desvios exploratórios (ex: blefe contra vilões passivos, punir calls excessivos).
5. next_street_plan: Plano de ação caso chamado para a próxima street.
`;

    const response = await aiClient.models.generateContent({
      model: 'models/gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            main_line: { type: Type.STRING },
            sizing_advice: { type: Type.STRING },
            gto_rationale: { type: Type.STRING },
            exploits_and_traps: { type: Type.STRING },
            next_street_plan: { type: Type.STRING },
          },
          required: ['main_line', 'sizing_advice', 'gto_rationale'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating deep strategic advice:', error);
    return res.status(500).json({
      error: 'Erro ao gerar análise aprofundada.',
      details: error?.message,
    });
  }
});

// Dev vs Prod Vite middleware
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
