import { ArenaPresentationSession } from '../arena/presentation/session/arena-presentation-session.js';

export function createArenaGame(platform, options) {
  return new ArenaPresentationSession(platform, options);
}
