import { executeQuery } from '../../database/db';
import sql from 'mssql';
import { SESSION_CACHE_TTL_SECONDS } from '../../core/constants/customer.constants';

/**
 * Authoritative check for "is this access token's session still live?".
 *
 * Access tokens are stateless, so revoking one means consulting server state.
 * Doing that on every request would add a query to the hot path, so results
 * are cached for a few seconds — short enough that a logout takes effect
 * almost immediately, long enough to keep the common case in memory.
 *
 * Revocations invalidate the cache synchronously (see invalidate/
 * invalidateUser), so the TTL is only a backstop for changes made outside
 * this process — e.g. an operator disabling a session directly in the
 * database, or a second application instance. In a multi-instance deployment
 * back this with Redis so invalidation is shared; the interface is unchanged.
 */
class SessionRegistry {
  private readonly cache = new Map<string, { active: boolean; userId: number; expiresAt: number }>();

  private key(sessionId: string): string {
    return `session:${sessionId}`;
  }

  /**
   * True only when the session row exists, is flagged active, has not expired,
   * and belongs to the user named in the token.
   */
  async isSessionActive(sessionId: string, userId: number): Promise<boolean> {
    if (!sessionId) return false;

    const cached = this.cache.get(this.key(sessionId));
    if (cached && cached.expiresAt > Date.now()) {
      return cached.active && cached.userId === userId;
    }

    const result = await executeQuery(
      `SELECT user_id FROM CustomerSessions
       WHERE session_id = @session_id AND is_active = 1 AND expires_at > GETDATE()`,
      { session_id: { type: sql.VarChar(100), value: sessionId } }
    );

    const row = result.recordset[0];
    const active = !!row;
    const ownerId: number = row?.user_id ?? -1;

    this.cache.set(this.key(sessionId), {
      active,
      userId: ownerId,
      expiresAt: Date.now() + SESSION_CACHE_TTL_SECONDS * 1000,
    });

    return active && ownerId === userId;
  }

  /** Drop a single session from the cache — call immediately after revoking. */
  invalidate(sessionId: string): void {
    this.cache.delete(this.key(sessionId));
  }

  /**
   * Drop every cached session for a user. Used by logout-all, password reset
   * and account deactivation, where the individual session IDs are not to
   * hand. Cheap: the map holds only recently-seen sessions.
   */
  invalidateUser(userId: number): void {
    for (const [key, value] of this.cache.entries()) {
      if (value.userId === userId) this.cache.delete(key);
    }
  }

  /** Periodic sweep so the map cannot grow without bound. */
  prune(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) this.cache.delete(key);
    }
  }
}

export const sessionRegistry = new SessionRegistry();

// Bound memory growth between requests.
const pruneTimer = setInterval(() => sessionRegistry.prune(), 60_000);
pruneTimer.unref();
