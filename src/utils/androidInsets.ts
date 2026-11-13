import { initialWindowMetrics } from 'react-native-safe-area-context'

/**
 * Android draws the app edge to edge (behind the status bar and the gesture / 3-button nav bar), so
 * fixed paddings that look right on one phone can slide under the system bars on another. These add the
 * phone's real system-bar height to the padding a screen already used. The app is portrait-only, so the
 * launch-time insets stay correct and no hook or provider is needed. iOS paths don't use these.
 */
const insets = initialWindowMetrics?.insets ?? { top: 0, bottom: 0, left: 0, right: 0 }

/** Padding below the status bar: at least `min`, and never less than the status bar plus `gap` */
export const androidTop = (min: number, gap = 8) => Math.max(min, insets.top + gap)

/** Padding above the nav bar: `base` plus the nav bar's height */
export const androidBottom = (base: number) => base + insets.bottom
