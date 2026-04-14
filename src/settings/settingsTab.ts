import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import RecallPlugin from "../../main";

export class RecallSettingTab extends PluginSettingTab {
	plugin: RecallPlugin;

	constructor(app: App, plugin: RecallPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Recall" });

		// ── Scope ──────────────────────────────────────────────────────────

		new Setting(containerEl)
			.setName("Scope")
			.setDesc("Search the entire vault or limit to a specific folder.")
			.addDropdown((dd) =>
				dd
					.addOption("vault", "Entire vault")
					.addOption("folder", "Specific folder")
					.setValue(this.plugin.settings.scopeMode)
					.onChange(async (val) => {
						this.plugin.settings.scopeMode = val as "vault" | "folder";
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.scopeMode === "folder") {
			new Setting(containerEl)
				.setName("Folder path")
				.setDesc("Path relative to vault root (e.g. Notes/Work). Applied recursively.")
				.addText((text) =>
					text
						.setPlaceholder("Notes/Work")
						.setValue(this.plugin.settings.scopeFolder)
						.onChange(async (val) => {
							this.plugin.settings.scopeFolder = val.trim();
							await this.plugin.saveSettings();
						})
				);
		}

		// ── Highlights ────────────────────────────────────────────────────

		new Setting(containerEl)
			.setName("Task highlight color")
			.setDesc("Accent color applied to Task:: in editor and reading view.")
			.addColorPicker((cp) =>
				cp
					.setValue(this.plugin.settings.taskHighlightColor)
					.onChange(async (val) => {
						this.plugin.settings.taskHighlightColor = val;
						await this.plugin.saveSettings();
						this.plugin.updateHighlightStyles();
					})
			);

		new Setting(containerEl)
			.setName("Reminder highlight color")
			.setDesc("Accent color applied to Reminder:: in editor and reading view.")
			.addColorPicker((cp) =>
				cp
					.setValue(this.plugin.settings.reminderHighlightColor)
					.onChange(async (val) => {
						this.plugin.settings.reminderHighlightColor = val;
						await this.plugin.saveSettings();
						this.plugin.updateHighlightStyles();
					})
			);

		// ── Defaults ──────────────────────────────────────────────────────

		new Setting(containerEl)
			.setName("Show completed tasks by default")
			.setDesc("When the Recall pane opens, show completed ([x]) tasks immediately.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showCompletedTasks)
					.onChange(async (val) => {
						this.plugin.settings.showCompletedTasks = val;
						await this.plugin.saveSettings();
					})
			);

		// ── Index ─────────────────────────────────────────────────────────

		containerEl.createEl("h3", { text: "Index" });

		const tasks = this.plugin.vaultIndex.getTasks();
		const reminders = this.plugin.vaultIndex.getReminders();
		const fileCount = new Set(
			[...tasks, ...reminders].map((d) => d.filePath)
		).size;

		containerEl.createEl("p", {
			cls: "recall-index-stats",
			text: `${tasks.length} task(s) · ${reminders.length} reminder(s) across ${fileCount} file(s)`,
		});

		new Setting(containerEl)
			.setName("Rebuild index")
			.setDesc("Re-scan the vault and rebuild the designation index from scratch.")
			.addButton((btn) =>
				btn
					.setButtonText("Rebuild now")
					.setCta()
					.onClick(async () => {
						btn.setButtonText("Rebuilding…");
						btn.setDisabled(true);
						await this.plugin.rebuildIndex();
						new Notice("Recall: index rebuilt.");
						btn.setButtonText("Rebuild now");
						btn.setDisabled(false);
						this.display(); // refresh stats
					})
			);
	}
}
