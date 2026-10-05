/**
 * Per-browser plugin preferences, persisted in localStorage.
 *
 * Why not the Host settings document: `ctx.settingsScope` (ui-settings) does
 * carry durable preferences into browser plugins, but only for a namespace
 * registered by the plugin's Host half — ours is a deliberate no-op — and it
 * goes inert on non-loopback pages. Per-browser storage covers one UI switch
 * without growing a Host half; better-sidebar made the same call.
 */
/** Preferences persisted under the versioned key. */
export interface MazeSettings {
    /** Whether the sidebar footer shows the Maze trigger (issue #11). */
    sidebarEntry: boolean;
}
/** Current preferences (stable reference until a value actually changes — uSES-safe). */
export declare function getMazeSettings(): MazeSettings;
/** Merge a patch; persist and notify only when a value actually changed. */
export declare function updateMazeSettings(patch: Partial<MazeSettings>): void;
/** Subscribe to preference changes (this tab's writes and other tabs'); returns the unsubscriber. */
export declare function subscribeMazeSettings(listener: () => void): () => void;
//# sourceMappingURL=settings.d.ts.map