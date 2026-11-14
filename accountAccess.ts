interface PaidProfile {
  isPro?: boolean;
  expiresAt?: string;
}

export function resolveAccess(trialEndsAt: number | null, profile: PaidProfile | undefined, now = Date.now()) {
  if (profile?.isPro === true) {
    if (!profile.expiresAt) return { plan: 'paid', endsAt: null };
    const paidEndsAt = Date.parse(profile.expiresAt);
    if (paidEndsAt > now) return { plan: 'paid', endsAt: paidEndsAt };
  }

  if (trialEndsAt !== null && trialEndsAt > now) return { plan: 'trial', endsAt: trialEndsAt };
  return { plan: 'free', endsAt: null };
}

export function trialEmailKey(email: string) {
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return local.split('+')[0].replaceAll('.', '') + '@gmail.com';
  }
  return local + '@' + domain;
}
