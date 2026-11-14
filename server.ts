import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { calculateDecision, normalizeCard } from './src/utils/pokerHeuristics';
import type { Stage } from './src/utils/pokerTypes';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 10000;

app.use(express.json({ limit: '15mb' }));

const firebaseApp = initializeApp({ credential: applicationDefault(), projectId: 'poker-vision-ai' });
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const paymentClient = token ? new MercadoPagoConfig({ accessToken: token }) : null;
const plans = {
  mensal: { name: 'Mensal', price: 29.90, days: 30 },
  semestral: { name: 'Semestral', price: 149.90, days: 180 },
  anual: { name: 'Anual', price: 249.90, days: 365 },
};

function getPlan(key: unknown) {
  return typeof key === 'string' && Object.hasOwn(plans, key) ? plans[key as keyof typeof plans] : undefined;
}

async function authenticatedEmail(req: Request) {
  const token = req.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return null;
  try {
    return (await auth.verifyIdToken(token)).email ?? null;
  } catch {
    return null;
  }
}

app.post('/api/checkout', async (req: Request, res: Response) => {
  const email = await authenticatedEmail(req);
  if (!email) return res.status(401).json({ error: 'Entre novamente para continuar.' });
  const { planType } = req.body;
  const plan = getPlan(planType);
  if (!plan) return res.status(400).json({ error: 'Selecione um plano válido.' });
  const origin = process.env.PUBLIC_APP_URL;
  if (!paymentClient || !origin) return res.status(503).json({ error: 'Checkout temporariamente indisponível.' });

  try {
    const backUrl = (status: string) => new URL('/?status=' + status, origin).href;
    const result = await new Preference(paymentClient).create({
      body: {
        items: [{ id: planType, title: 'Poker Vision AI - PRO (' + plan.name + ')', quantity: 1, unit_price: plan.price, currency_id: 'BRL' }],
        back_urls: { success: backUrl('success'), failure: backUrl('failure'), pending: backUrl('pending') },
        notification_url: new URL('/api/webhook', origin).href,
        auto_return: 'approved',
        metadata: { plan_type: planType, user_email: email },
      },
    });
    const url = process.env.MERCADO_PAGO_SANDBOX === 'true' ? result.sandbox_init_point : result.init_point;
    if (!url) return res.status(502).json({ error: 'O provedor não retornou o endereço do checkout.' });
    return res.json({ init_point: url });
  } catch {
    return res.status(502).json({ error: 'Não foi possível iniciar o checkout. Tente novamente.' });
  }
});

app.post('/api/webhook', async (req: Request, res: Response) => {
  const action = req.body.action ?? req.query.topic ?? req.body.type;
  const paymentId = String(req.body.data?.id ?? req.query.id ?? '');
  if (typeof action !== 'string' || (action !== 'payment' && !action.startsWith('payment.')) || !/^\d+$/.test(paymentId)) {
    return res.sendStatus(200);
  }
  if (!paymentClient) return res.sendStatus(503);
  try {
    const payment = await new Payment(paymentClient).get({ id: paymentId });
    const { plan_type, user_email } = payment.metadata ?? {};
    const plan = getPlan(plan_type);
    if (payment.status !== 'approved' || !plan || typeof user_email !== 'string' ||
        payment.currency_id !== 'BRL' || payment.transaction_amount !== plan.price ||
        payment.live_mode !== (process.env.MERCADO_PAGO_SANDBOX !== 'true')) return res.sendStatus(200);

    const receipt = db.collection('processedPayments').doc(paymentId);
    const profile = db.collection('users').doc(user_email);
    await db.runTransaction(async (transaction) => {
      if ((await transaction.get(receipt)).exists) return;
      const current = (await transaction.get(profile)).data();
      const currentExpiry = current?.isPro === true ? Date.parse(current.expiresAt ?? '') : NaN;
      const approvedAt = Date.parse(payment.date_approved ?? '');
      const startsAt = Math.max(currentExpiry || 0, approvedAt || Date.now());
      transaction.set(profile, { isPro: true, expiresAt: new Date(startsAt + plan.days * 86400000).toISOString() }, { merge: true });
      transaction.create(receipt, { processedAt: new Date().toISOString() });
    });
    return res.sendStatus(200);
  } catch {
    return res.sendStatus(500);
  }
});

function parseCardList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const cards = value.map((item) => typeof item === 'string' ? normalizeCard(item) : null);
  return cards.every((card): card is string => card !== null) ? cards : null;
}

app.post('/api/poker/analyze', async (req: Request, res: Response) => {
  const email = await authenticatedEmail(req);
  if (!email) return res.status(401).json({ error: 'Entre novamente para analisar uma imagem.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'Análise de imagens temporariamente indisponível.' });
  const image = typeof req.body.image === 'string' && req.body.image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/);
  if (!image) return res.status(400).json({ error: 'Envie uma imagem JPEG, PNG ou WebP.' });
  try {
    const profile = (await db.collection('users').doc(email).get()).data();
    if (profile?.isPro !== true || (profile.expiresAt && !(Date.parse(profile.expiresAt) > Date.now()))) {
      return res.status(403).json({ error: 'A análise de imagens está disponível no plano PRO.' });
    }
    const model = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        contents: [{ parts: [
          { text: 'Identifique as duas cartas do jogador e as cartas comunitárias visíveis em uma mesa de Texas Hold’em. Use códigos As, Th, 2c (T para 10). Retorne listas vazias quando não for possível identificar as cartas com segurança.' },
          { inlineData: { mimeType: image[1], data: image[2] } },
        ] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', required: ['hero_hand', 'board'], properties: {
            hero_hand: { type: 'ARRAY', items: { type: 'STRING' } },
            board: { type: 'ARRAY', items: { type: 'STRING' } },
          } },
        },
      }),
    });
    if (!response.ok) return res.status(502).json({ error: 'O serviço de análise não respondeu. Tente novamente.' });
    const result = await response.json();
    const detected = JSON.parse(result.candidates?.[0]?.content?.parts?.find((part: { text?: string; thought?: boolean }) => part.text && !part.thought)?.text ?? '{}');
    const hero = parseCardList(detected.hero_hand);
    const board = parseCardList(detected.board);
    if (!hero || hero.length !== 2 || !board || ![0, 3, 4, 5].includes(board.length) ||
        new Set([...hero, ...board]).size !== hero.length + board.length) {
      return res.status(422).json({ error: 'Não foi possível identificar as cartas com segurança. Tente outra imagem.' });
    }
    return res.json({ hero_hand: hero, board });
  } catch {
    return res.status(502).json({ error: 'Não foi possível analisar a imagem. Tente novamente.' });
  }
});

// --- LÓGICA GTO ---
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

app.post('/api/poker/calculate', (req: Request, res: Response) => {
  try {
    const { position, stackDepth, actionToHero, gameMode } = req.body;
    const heroHand = parseCardList(req.body.heroHand);
    const board = parseCardList(req.body.board ?? []);
    if (!heroHand || heroHand.length !== 2 || !board || ![0, 3, 4, 5].includes(board.length) ||
        new Set([...heroHand, ...board]).size !== heroHand.length + board.length ||
        !['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'].includes(position) ||
        !['low', 'medium', 'deep'].includes(stackDepth) ||
        !['unopened', 'limp', 'raise', '3bet'].includes(actionToHero) ||
        !['CASH', 'MTT', 'SPIN'].includes(gameMode)) {
      return res.status(400).json({ error: 'Confira as cartas e as opções da mão.' });
    }
    if (board.length) {
      const stage: Stage = board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river';
      const result = calculateDecision({
        heroCardsRaw: heroHand, boardCardsRaw: board, stage, position,
        effectiveStackBB: stackDepth === 'low' ? 12 : stackDepth === 'deep' ? 100 : 40,
        activeVillains: null, actionToHero,
      });
      const rationale = result.tacticalJustification.replace(/\. (?:Combine a fold equity|Busque fechar o draw).*$/, '.');
      return res.json({ action: result.primaryAction.replace('_', '-'), sizing: result.recommendedBetSize, rationale });
    }

    const handKey = getHandKey(heroHand[0], heroHand[1]);
    const isPremium = PREMIUM_HANDS.includes(handKey); const isStrong = STRONG_HANDS.includes(handKey);
    const isPlayable = PLAYABLE_HANDS.includes(handKey); const isSpinPush = SPIN_PUSH_HANDS.includes(handKey);

    if (gameMode === 'SPIN') {
      if (stackDepth === 'low') {
        if (actionToHero === 'unopened') return res.json(isSpinPush ? { action: 'ALL-IN', sizing: 'Push', rationale: `Nash Shove.` } : { action: 'FOLD', sizing: '0', rationale: 'Fold GTO.' });
      }
      return res.json((isPremium || isStrong || isPlayable) ? { action: 'RAISE', sizing: '2.0x BB', rationale: 'Min-raise.' } : { action: 'FOLD', sizing: '0', rationale: 'Fold GTO.' });
    }

    if (gameMode === 'CASH') {
      if (actionToHero === 'unopened') {
        if (isPremium || isStrong) return res.json({ action: 'RAISE', sizing: '3.0x BB', rationale: `Cash: Open-raise maior devido ao Rake.` });
        if (isPlayable && ['CO', 'BTN'].includes(position)) return res.json({ action: 'RAISE', sizing: '2.5x BB', rationale: `Roubo em posição.` });
        return res.json({ action: 'FOLD', sizing: '0', rationale: `Fold.` });
      }
      if (actionToHero === 'raise') {
        if (isPremium) return res.json({ action: 'RAISE', sizing: '3-Bet (3.5x)', rationale: `3-Bet valor.` });
        if ((isStrong || isPlayable) && position === 'BB') return res.json({ action: 'CALL', sizing: 'Call', rationale: `Defesa de BB.` });
        return res.json({ action: 'FOLD', sizing: '0', rationale: `Fold.` });
      }
    }

    if (actionToHero === 'unopened') {
      if (isPremium || isStrong) return res.json({ action: 'RAISE', sizing: '2.2x BB', rationale: `Open MTT.` });
      if (isPlayable && ['CO', 'BTN', 'SB'].includes(position)) return res.json({ action: 'RAISE', sizing: '2.0x BB', rationale: `Roubo.` });
      return res.json({ action: 'FOLD', sizing: '0', rationale: `Fold.` });
    }
    return res.json({ action: 'FOLD', sizing: '0', rationale: `Fold padrão.` });

  } catch (error) {
    return res.status(500).json({ action: 'ERRO', sizing: '-', rationale: 'Erro interno.' });
  }
});

async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    // Serve os ficheiros compilados do React corretamente no Render
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }
  
  app.listen(PORT, '0.0.0.0', () => console.log(`Poker Backend Seguro na PORTA ${PORT}`));
}
setupServer();
