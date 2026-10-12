const TOKEN_KEY = 'entitlement.session.token';

/** 从 JWT payload 中读取邮箱（sub）与过期时间（exp，秒）。 */
const decodePayload = (
  token: string,
): { email: string | null; expiresAt: number | null } => {
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return {
      email: typeof json.sub === 'string' ? json.sub : null,
      expiresAt: typeof json.exp === 'number' ? json.exp * 1000 : null,
    };
  } catch {
    return { email: null, expiresAt: null };
  }
};

export interface AuthState {
  readonly token: string | null;
  readonly email: string | null;
  /** token 过期时间（毫秒时间戳），无 exp 时为 null。 */
  readonly expiresAt: number | null;
}

let state: AuthState = loadInitial();
const listeners = new Set<() => void>();

function loadInitial(): AuthState {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return { token: null, email: null, expiresAt: null };
  }
  const { email, expiresAt } = decodePayload(token);
  if (expiresAt !== null && expiresAt <= Date.now()) {
    localStorage.removeItem(TOKEN_KEY);
    return { token: null, email: null, expiresAt: null };
  }
  return { token, email, expiresAt };
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

export const authStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState(): AuthState {
    return state;
  },
  login(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    const { email, expiresAt } = decodePayload(token);
    state = { token, email, expiresAt };
    emit();
  },
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    state = { token: null, email: null, expiresAt: null };
    emit();
  },
  isAuthenticated(): boolean {
    const { token, expiresAt } = state;
    if (!token) return false;
    if (expiresAt !== null && expiresAt <= Date.now()) {
      authStore.logout();
      return false;
    }
    return true;
  },
};
