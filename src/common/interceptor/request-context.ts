import { AsyncLocalStorage } from 'async_hooks';

interface ContextStore {
  userId: string;
  role?: string;
  ip_address?: string;
  user_agent?: string;
}

export const requestContext = new AsyncLocalStorage<ContextStore>();
