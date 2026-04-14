import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

interface RecallSettings {
	// Add settings here
}

const DEFAULT_SETTINGS: RecallSettings = {
	// Add default values here
};

export default class RecallPlugin extends Plugin {
	settings: RecallSettings;

	async onload() {
		await this.loadSettings();

		// Add a ribbon icon
		this.addRibbonIcon("dice", "Recall", (_evt: MouseEvent) => {
			new Notice("Recall plugin loaded!");
		});

		// Add a command
		this.addCommand({
			id: "recall-example-command",
			name: "Example command",
			callback: () => {
				new Notice("Example command triggered");
			},
		});

		// Add an editor command
		this.addCommand({
			id: "recall-editor-command",
			name: "Example editor command",
			editorCallback: (editor: Editor, _view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Recall plugin");
			},
		});

		// Add settings tab
		this.addSettingTab(new RecallSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class RecallSettingTab extends PluginSettingTab {
	plugin: RecallPlugin;

	constructor(app: App, plugin: RecallPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("A setting description")
			.addText((text) =>
				text
					.setPlaceholder("Enter value")
					.setValue("")
					.onChange(async (_value) => {
						await this.plugin.saveSettings();
					})
			);
	}
}
