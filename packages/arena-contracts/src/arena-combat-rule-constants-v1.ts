/**
 * Maximum authority ticks between the first resolved hit and its final
 * WeaponFeedbackResolved classification. All three Arena modes share this
 * rule; callers must not fork a mode-local value.
 */
export const ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1 = 20 as const;
