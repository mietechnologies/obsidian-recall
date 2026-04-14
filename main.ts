import { Plugin, WorkspaceLeaf } from "obsidian";
import { RecallSettings, DEFAULT_SETTINGS } from "./src/settings/settings";
import { RecallSettingTab } from "./src/settings/settingsTab";
import { VaultIndex } from "./src/index/vaultIndex";
import { DesignationView, VIEW_TYPE_RECALL } from "./src/views/designationView";
import { createHighlightExtension, readingViewPostProcessor } from "./src/highlight/highlighter";

export default class RecallPlugin extends Plugin {
	settings: RecallSettings;
	vaultIndex: VaultIndex;
	private styleEl: HTMLStyleElement;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Dynamic highlight colors injected as a <style> element
		this.styleEl = document.createElement("style");
		this.styleEl.id = "recall-dynamic-styles";
		document.head.appendChild(this.styleEl);
		this.updateHighlightStyles();

		// Vault index
		this.vaultIndex = new VaultIndex(this.app);

		// Side pane view
		this.registerView(VIEW_TYPE_RECALL, (leaf) => new DesignationView(leaf, this));

		// Settings tab
		this.addSettingTab(new RecallSettingTab(this.app, this));

		// Editor highlighting (CodeMirror 6)
		this.registerEditorExtension(createHighlightExtension());

		// Reading-view highlighting
		this.registerMarkdownPostProcessor(readingViewPostProcessor);

		// Ribbon
		this.addRibbonIcon("bookmark", "Open Recall pane", () => this.activateView());

		// Commands
		this.addCommand({
			id: "open-recall-pane",
			name: "Open designation pane",
			callback: () => this.activateView(),
		});

		this.addCommand({
			id: "rebuild-recall-index",
			name: "Rebuild index",
			callback: () => this.rebuildIndex(),
		});

		this.addCommand({
			id: "toggle-completed-tasks",
			name: "Toggle completed tasks in pane",
			callback: () => {
				for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_RECALL)) {
					if (leaf.view instanceof DesignationView) {
						leaf.view.toggleCompleted();
					}
				}
			},
		});

		// Build index once the workspace is ready
		this.app.workspace.onLayoutReady(async () => {
			const scopeFolder = this.resolvedScopeFolder();
			await this.vaultIndex.buildIndex(scopeFolder);
			this.vaultIndex.registerEvents(scopeFolder);
		});
	}

	onunload(): void {
		this.vaultIndex?.unregisterEvents();
		this.styleEl?.remove();
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_RECALL);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	updateHighlightStyles(): void {
		const { taskHighlightColor, reminderHighlightColor } = this.settings;
		this.styleEl.textContent = `
			:root {
				--recall-task-color: ${taskHighlightColor};
				--recall-reminder-color: ${reminderHighlightColor};
			}
		`;
	}

	async rebuildIndex(): Promise<void> {
		this.vaultIndex.unregisterEvents();
		const scopeFolder = this.resolvedScopeFolder();
		await this.vaultIndex.buildIndex(scopeFolder);
		this.vaultIndex.registerEvents(scopeFolder);
	}

	private resolvedScopeFolder(): string | undefined {
		return this.settings.scopeMode === "folder" && this.settings.scopeFolder
			? this.settings.scopeFolder
			: undefined;
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(VIEW_TYPE_RECALL);

		if (existing.length > 0) {
			workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf("tab");
		await leaf.setViewState({ type: VIEW_TYPE_RECALL, active: true });
		workspace.revealLeaf(leaf);
	}
}
