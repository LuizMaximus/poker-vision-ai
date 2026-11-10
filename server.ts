import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// --- LÓGICA GTO MIGRADA PARA O SERVIDOR (PROTEGIDA) ---
const getRankVal = (r: string) => '23456789TJQKA'.indexOf(r.toUpperCase());

function getHandKey(card1: string, card2: string): string {
  if (!card1 || !card2) return '';
  const r1 = card1[0]?.toUpperCase();
  const r2 = card2[0]?.toUpperCase();
  const isSuited = card1[1]?.toLowerCase() === card2[1]?.toLowerCase();
  const v1 = getRankVal(r1);
  const v2 = getRankVal(r2);
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
  const hasFlush = maxSuitCount >= 5;
  const hasFlushDraw = maxSuitCount === 4;

  const hRanks = heroHand.map(c => getRankVal(c[0]));
  const bRanks = board.map(c => getRankVal(c[0]));
  const highestBoardRank = Math.max(...bRanks);
  const isPocketPair = hRanks[0] === hRanks[1];
  const isOverpair = isPocketPair && hRanks[0] > highestBoardRank;
  
  let hitBoardCount = 0;
  let isTopPair = false;
  let isMidBottomPair = false;
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

// Endpoint de Cálculo GTO Protegido
app.post('/api/poker/calculate', (req: Request, res: Response) => {
  try {
    const { heroHand, board, position, stackDepth, actionToHero, gameMode } = req.body;
    
    // FUTURO PAYWALL: Aqui o servidor vai verificar se o utilizador tem assinatura PRO
    // const isProUser = verificarBancoDeDados(req.user.id);
    const isProUser = true; // Simulação para já
    
    if (board && board.length >= 3) {
      if (!isProUser) {
        return res.status(403).json({ action: 'BLOQUEADO', confidence: 0, sizing: '-', rationale: 'Acesso Pós-Flop requer assinatura PRO.', evEstimate: 0, riskLevel: 'HIGH' });
      }

      const postFlop = evaluatePostFlop(heroHand, board);
      const stage = board.length === 3 ? 'Flop' : board.length === 4 ? 'Turn' : 'River';

      if (postFlop.category === 'monster' || postFlop.category === 'strong') {
        return res.json({ action: 'RAISE', confidence: 0.95, sizing: '50% a 75% Pote', rationale: `Modo PRO (${stage}): ${postFlop.desc}. Extraia valor!`, evEstimate: 4.5, riskLevel: 'HIGH' });
      }
      if (postFlop.category === 'marginal_plus') {
        return res.json({ action: 'CALL', confidence: 0.85, sizing: 'Controle', rationale: `Modo PRO (${stage}): ${postFlop.desc}. Controle o pote.`, evEstimate: 1.5, riskLevel: 'MEDIUM' });
      }
      if (postFlop.isDraw) {
        return res.json({ action: 'CALL / SEMI-BLUFF', confidence: 0.8, sizing: 'Odds', rationale: `Modo PRO (${stage}): ${postFlop.desc}. Pague pelas odds ou aposte.`, evEstimate: 1.2, riskLevel: 'HIGH' });
      }
      return res.json({ action: 'CHECK / FOLD', confidence: 0.9, sizing: '0', rationale: `Modo PRO (${stage}): ${postFlop.desc}. Desista para agressão.`, evEstimate: 0, riskLevel: 'LOW' });
    }

    const handKey = getHandKey(heroHand[0], heroHand[1]);
    const isPremium = PREMIUM_HANDS.includes(handKey);
    const isStrong = STRONG_HANDS.includes(handKey);
    const isPlayable = PLAYABLE_HANDS.includes(handKey);
    const isSpinPush = SPIN_PUSH_HANDS.includes(handKey);

    if (gameMode === 'SPIN') {
      if (stackDepth === 'low') {
        if (actionToHero === 'unopened') return res.json(isSpinPush 
          ? { action: 'ALL-IN', confidence: 0.98, sizing: 'Push', rationale: `Nash Shove com ${handKey}.`, evEstimate: 3.0, riskLevel: 'HIGH' }
          : { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: 'Fold GTO.', evEstimate: 0, riskLevel: 'LOW' });
      }
      return res.json((isPremium || isStrong || isPlayable) 
        ? { action: 'RAISE', confidence: 0.9, sizing: '2.0x BB', rationale: 'Min-raise Spin.', evEstimate: 1.5, riskLevel: 'MEDIUM' }
        : { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: 'Fold GTO.', evEstimate: 0, riskLevel: 'LOW' });
    }

    if (gameMode === 'CASH') {
      if (actionToHero === 'unopened') {
        if (isPremium || isStrong) return res.json({ action: 'RAISE', confidence: 0.95, sizing: '3.0x BB', rationale: `Cash: Open-raise maior devido ao Rake.`, evEstimate: 2.5, riskLevel: 'MEDIUM' });
        if (isPlayable && ['CO', 'BTN'].includes(position)) return res.json({ action: 'RAISE', confidence: 0.85, sizing: '2.5x BB', rationale: `Roubo em posição (Cash).`, evEstimate: 1.2, riskLevel: 'MEDIUM' });
        return res.json({ action: 'FOLD', confidence: 0.9, sizing: '0', rationale: `Fold.`, evEstimate: 0, riskLevel: 'LOW' });
      }
      if (actionToHero === 'raise') {
        if (isPremium) return res.json({ action: 'RAISE', confidence: 0.95, sizing: '3-Bet (3.5x)', rationale: `3-Bet valor.`, evEstimate: 4.0, riskLevel: 'HIGH' });
        if ((isStrong || isPlayable) && position === 'BB') return res.json({ action: 'CALL', confidence: 0.85, sizing: 'Call', rationale: `Defesa de BB.`, evEstimate: 1.0, riskLevel: 'MEDIUM' });
        return res.json({ action: 'FOLD', confidence: 0.9, sizing: '0', rationale: `Fold contra raise.`, evEstimate: 0, riskLevel: 'LOW' });
      }
    }

    // MTT
    if (stackDepth === 'low') {
      if (actionToHero === 'unopened' || actionToHero === 'limp') return res.json((isPremium || isStrong || (isPlayable && ['CO', 'BTN', 'SB'].includes(position)))
        ? { action: 'ALL-IN', confidence: 0.95, sizing: 'Push', rationale: `MTT Push direto.`, evEstimate: 2.8, riskLevel: 'HIGH' }
        : { action: 'FOLD', confidence: 0.9, sizing: '0', rationale: `Fold MTT.`, evEstimate: 0, riskLevel: 'LOW' });
      if (actionToHero === 'raise') return res.json((isPremium || (isStrong && ['BTN', 'BB'].includes(position)))
        ? { action: 'ALL-IN', confidence: 0.95, sizing: 'Re-shove', rationale: `Re-shove valor.`, evEstimate: 3.5, riskLevel: 'HIGH' }
        : { action: 'FOLD', confidence: 0.95, sizing: '0', rationale: `Fold para raise.`, evEstimate: 0, riskLevel: 'LOW' });
    }

    if (actionToHero === 'unopened') {
      if (isPremium || isStrong) return res.json({ action: 'RAISE', confidence: 0.92, sizing: '2.2x BB', rationale: `Open MTT.`, evEstimate: 1.8, riskLevel: 'MEDIUM' });
      if (isPlayable && ['CO', 'BTN', 'SB'].includes(position)) return res.json({ action: 'RAISE', confidence: 0.85, sizing: '2.0x BB', rationale: `Roubo late pos.`, evEstimate: 1.1, riskLevel: 'MEDIUM' });
      return res.json({ action: 'FOLD', confidence: 0.88, sizing: '0', rationale: `Fold.`, evEstimate: 0, riskLevel: 'LOW' });
    }
    if (actionToHero === 'raise') {
      if (isPremium) return res.json({ action: 'RAISE', confidence: 0.95, sizing: '3-Bet (2.8x)', rationale: `3-Bet.`, evEstimate: 3.2, riskLevel: 'HIGH' });
      if (isStrong && position === 'BB') return res.json({ action: 'CALL', confidence: 0.82, sizing: 'Call', rationale: `Defesa Odds.`, evEstimate: 0.8, riskLevel: 'MEDIUM' });
      return res.json({ action: 'FOLD', confidence: 0.9, sizing: '0', rationale: `Fold seguro.`, evEstimate: 0, riskLevel: 'LOW' });
    }

    return res.json({ action: 'FOLD', confidence: 0.8, sizing: '0', rationale: `Fold padrão.`, evEstimate: 0, riskLevel: 'LOW' });

  } catch (error) {
    return res.status(500).json({ action: 'ERRO', confidence: 0, sizing: '-', rationale: 'Erro interno no servidor.', evEstimate: 0, riskLevel: 'LOW' });
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
  app.listen(PORT, '0.0.0.0', () => console.log(`Poker Backend Securing Logic on PORT ${PORT}`));
}
setupServer();
