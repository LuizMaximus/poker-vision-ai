import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { MercadoPagoConfig, Preference } from 'mercadopago'; // NOVO: Mercado Pago

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// --- CONFIGURAÇÃO MERCADO PAGO ---
const client = new MercadoPagoConfig({ accessToken: 'APP_USR-ac8e4980-cd21-4ec0-ad5f-5e7e33096994' });

// ENDPOINT 1: Criar Link de Pagamento (Checkout Pro)
app.post('/api/checkout', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const origin = req.headers.origin || `http://localhost:${PORT}`;
    
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'plano_pro',
            title: 'Poker Vision AI - Acesso PRO (Motor Pós-Flop)',
            quantity: 1,
            unit_price: 29.90, // <--- ALTRE AQUI O PREÇO DO SEU SAAS
            currency_id: 'BRL',
          }
        ],
        payer: { email: email },
        back_urls: {
          success: `${origin}?status=success`,
          failure: `${origin}?status=failure`,
          pending: `${origin}?status=pending`
        },
        auto_return: 'approved'
      }
    });

    res.json({ init_point: result.init_point });
  } catch (error) {
    console.error("Erro no Mercado Pago:", error);
    res.status(500).json({ error: 'Falha ao gerar link de pagamento.' });
  }
});

// --- LÓGICA GTO (MANTIDA INTACTA) ---
const getRankVal = (r: string) => '23456789TJQKA'.indexOf(r.toUpperCase());
function getHandKey(card1: string, card2: string): string {
  if (!card1 || !card2) return '';
  const r1 = card1[0]?.toUpperCase();
  const r2 = card2[0]?.toUpperCase();
  const isSuited = card1[1]?.toLowerCase() === card2[1]?.toLowerCase();
  const v1 = getRankVal(r1); const v2 = getRankVal(r2);
  if (v1 === v2) return `${r1}${r2}`;
  return v1 > v2 ? `${r1}${r2}${isSuited ? 's' : 'o'}` : `${r2}${r1}${isSuited ? 's' : 'o'}`;
}

const PREMIUM_HANDS = ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs'];
const STRONG_HANDS = ['99', '88', '77', 'AJs', 'ATs', 'AQo', 'KQs', 'KJs'];
const PLAYABLE_HANDS = ['66', '55', '44', '33', '22', 'A9s', 'A8s', 'A5s', 'A4s', 'AJo', 'ATo', 'KQo', 'QJs', 'JTs', 'T9s', '98s'];
const SPIN_PUSH_HANDS = [...PREMIUM_HANDS, ...STRONG_HANDS, ...PLAYABLE_HANDS, 'A2o', 'A3o', 'A4o', 'A5o', 'A6o', 'A7o', 'A8o', 'A9o', 'K9s', 'K8s', 'Q9s'];

function evaluatePostFlop(heroHand: string[], board: string[]) {
  const allCards = [...heroHand, ...board];
  const suitCounts: Record<string, number> = {};
  allCards.forEach(c => { const s = c[1]; suitCounts[s] = (suitCounts[s] || 0) + 1; });
  const maxSuitCount = Math.max(...Object.values(suitCounts), 0);
  const hasFlush = maxSuitCount >= 5; const hasFlushDraw = maxSuitCount === 4;

  const hRanks = heroHand.map(c => getRankVal(c[0]));
  const bRanks = board.map(c => getRankVal(c[0]));
  const highestBoardRank = Math.max(...bRanks);
  const isPocketPair = hRanks[0] === hRanks[1];
  const isOverpair = isPocketPair && hRanks[0] > highestBoardRank;
  
  let hitBoardCount = 0; let isTopPair = false; let isMidBottomPair = false;
  hRanks.forEach(hr => {
    if (bRanks.includes(hr)) {
      hitBoardCount++;
      if (hr === highestBoardRank) isTopPair = true;
      else isMidBottomPair = true;
    }
  });

  const isTwoPairOrSet = hitBoardCount >= 2 || (isPocketPair && bRanks.includes(hRanks[0]));
  if (hasFlush) return { category: 'monster', desc: 'Flush Completo', isDraw: false };
  if (isTwoPairOrSet) return { category: 'strong', desc: 'Dois Pares ou Trinca', isDraw: false };
  if (isOverpair) return { category: 'strong', desc: 'Overpair', isDraw: false };
  if (isTopPair) return { category: 'marginal_plus', desc: 'Top Pair', isDraw: false };
  if (hasFlushDraw) return { category: 'draw', desc: 'Flush Draw', isDraw: true };
  if (isMidBottomPair) return { category: 'marginal', desc: 'Par Médio/Baixo', isDraw: false };
  return { category: 'trash', desc: 'Air (Sem acerto)', isDraw: false };
}

// ENDPOINT 2: Cálculo de Poker (Motor GTO)
app.post('/api/poker/calculate', (req: Request, res: Response) => {
  try {
    const { heroHand, board, position, stackDepth, actionToHero, gameMode } = req.body;
    const isProUser = true; // No futuro, o servidor vai ler o BD, por agora bloqueamos apenas no Front
    
    if (board && board.length >= 3) {
      const postFlop = evaluatePostFlop(heroHand, board);
      const stage = board.length === 3 ? 'Flop' : board.length === 4 ? 'Turn' : 'River';
      if (postFlop.category === 'monster' || postFlop.category === 'strong') return res.json({ action: 'RAISE', confidence: 0.95, sizing: '50% a 75% Pote', rationale: `Modo PRO (${stage}): ${postFlop.desc}. Extraia valor!`, evEstimate: 4.5, riskLevel: 'HIGH' });
      if (postFlop.category === 'marginal_plus') return res.json({ action: 'CALL', confidence: 0.85, sizing: 'Controle', rationale: `Modo PRO (${stage}): ${postFlop.desc}. Controle o pote.`, evEstimate: 1.5, riskLevel: 'MEDIUM' });
      if (postFlop.isDraw) return res.json({ action: 'CALL / SEMI-BLUFF', confidence: 0.8, sizing: 'Odds', rationale: `Modo PRO (${stage}): ${postFlop.desc}. Pague pelas odds ou aposte.`, evEstimate: 1.2, riskLevel: 'HIGH' });
      return res.json({ action: 'CHECK / FOLD', confidence: 0.9, sizing: '0', rationale: `Modo PRO (${stage}): ${postFlop.desc}. Desista para agressão.`, evEstimate: 0, riskLevel: 'LOW' });
    }

    const handKey = getHandKey(heroHand[0], heroHand[1]);
    const isPremium = PREMIUM_HANDS.includes(handKey); const isStrong = STRONG_HANDS.includes(handKey);
    const isPlayable = PLAYABLE_HANDS.includes(handKey); const isSpinPush = SPIN_PUSH_HANDS.includes(handKey);

    if (gameMode === 'SPIN') {
      if (stackDepth === 'low') {
        if (actionToHero === 'unopened') return res.json(isSpinPush ? { action: 'ALL-IN', confidence: 0.98, sizing: 'Push', rationale: `Nash Shove.`, evEstimate: 3.0, riskLevel: 'HIGH' } : { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: 'Fold GTO.', evEstimate: 0, riskLevel: 'LOW' });
      }
      return res.json((isPremium || isStrong || isPlayable) ? { action: 'RAISE', confidence: 0.9, sizing: '2.0x BB', rationale: 'Min-raise.', evEstimate: 1.5, riskLevel: 'MEDIUM' } : { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: 'Fold GTO.', evEstimate: 0, riskLevel: 'LOW' });
    }

    if (gameMode === 'CASH') {
      if (actionToHero === 'unopened') {
        if (isPremium || isStrong) return res.json({ action: 'RAISE', confidence: 0.95, sizing: '3.0x BB', rationale: `Cash: Open-raise maior devido ao Rake.`, evEstimate: 2.5, riskLevel: 'MEDIUM' });
        if (isPlayable && ['CO', 'BTN'].includes(position)) return res.json({ action: 'RAISE', confidence: 0.85, sizing: '2.5x BB', rationale: `Roubo em posição.`, evEstimate: 1.2, riskLevel: 'MEDIUM' });
        return res.json({ action: 'FOLD', confidence: 0.9, sizing: '0', rationale: `Fold.`, evEstimate: 0, riskLevel: 'LOW' });
      }
      if (actionToHero === 'raise') {
        if (isPremium) return res.json({ action: 'RAISE', confidence: 0.95, sizing: '3-Bet (3.5x)', rationale: `3-Bet valor.`, evEstimate: 4.0, riskLevel: 'HIGH' });
        if ((isStrong || isPlayable) && position === 'BB') return res.json({ action: 'CALL', confidence: 0.85, sizing: 'Call', rationale: `Defesa de BB.`, evEstimate: 1.0, riskLevel: 'MEDIUM' });
        return res.json({ action: 'FOLD', confidence: 0.9, sizing: '0', rationale: `Fold.`, evEstimate: 0, riskLevel: 'LOW' });
      }
    }

    if (actionToHero === 'unopened') {
      if (isPremium || isStrong) return res.json({ action: 'RAISE', confidence: 0.92, sizing: '2.2x BB', rationale: `Open MTT.`, evEstimate: 1.8, riskLevel: 'MEDIUM' });
      if (isPlayable && ['CO', 'BTN', 'SB'].includes(position)) return res.json({ action: 'RAISE', confidence: 0.85, sizing: '2.0x BB', rationale: `Roubo.`, evEstimate: 1.1, riskLevel: 'MEDIUM' });
      return res.json({ action: 'FOLD', confidence: 0.88, sizing: '0', rationale: `Fold.`, evEstimate: 0, riskLevel: 'LOW' });
    }
    return res.json({ action: 'FOLD', confidence: 0.8, sizing: '0', rationale: `Fold padrão.`, evEstimate: 0, riskLevel: 'LOW' });

  } catch (error) {
    return res.status(500).json({ action: 'ERRO', confidence: 0, sizing: '-', rationale: 'Erro interno.', evEstimate: 0, riskLevel: 'LOW' });
  }
});

async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`Poker Backend Seguro na PORTA ${PORT}`));
}
setupServer();
