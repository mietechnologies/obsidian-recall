export interface RecallSettings {
	scopeMode: "vault" | "folder";
	scopeFolder: string;
	taskHighlightColor: string;
	reminderHighlightColor: string;
	showCompletedTasks: boolean;
}

export const DEFAULT_SETTINGS: RecallSettings = {
	scopeMode: "vault",
	scopeFolder: "",
	taskHighlightColor: "#e8a000",
	reminderHighlightColor: "#4a9ef5",
	showCompletedTasks: false,
};
