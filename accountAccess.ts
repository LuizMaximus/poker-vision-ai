interface PaidProfile {
  isPro?: boolean;
  expiresAt?: string;
}

export function resolveAccess(createdAt: string, profile: PaidProfile | undefined, now = Date.now()) {
  if (profile?.isPro === true) {
    if (!profile.expiresAt) return { plan: 'paid', endsAt: null };
    const paidEndsAt = Date.parse(profile.expiresAt);
    if (paidEndsAt > now) return { plan: 'paid', endsAt: paidEndsAt };
  }

  const trialStartsAt = Date.parse(createdAt);
  const trialEndsAt = trialStartsAt + 3 * 86400000;
  if (trialStartsAt <= now && trialEndsAt > now) return { plan: 'trial', endsAt: trialEndsAt };
  return { plan: 'free', endsAt: null };
}
