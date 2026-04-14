import { ItemView, MarkdownView, TFile, WorkspaceLeaf } from "obsidian";
import { TaskDesignation, ReminderDesignation } from "../types";
import RecallPlugin from "../../main";

export const VIEW_TYPE_RECALL = "recall-designation-view";

export class DesignationView extends ItemView {
	private plugin: RecallPlugin;
	private showCompleted: boolean;
	private unsubscribe?: () => void;

	constructor(leaf: WorkspaceLeaf, plugin: RecallPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.showCompleted = plugin.settings.showCompletedTasks;
	}

	getViewType(): string {
		return VIEW_TYPE_RECALL;
	}

	getDisplayText(): string {
		return "Recall";
	}

	getIcon(): string {
		return "bookmark";
	}

	async onOpen(): Promise<void> {
		this.unsubscribe = this.plugin.vaultIndex.onChange(() => this.render());
		this.render();
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
	}

	render(): void {
		const root = this.containerEl.children[1] as HTMLElement;
		root.empty();
		root.addClass("recall-view");

		this.renderTasksSection(root);
		this.renderRemindersSection(root);
	}

	// ── Tasks ────────────────────────────────────────────────────────────────

	private renderTasksSection(root: HTMLElement): void {
		const allTasks = this.plugin.vaultIndex.getTasks();
		const visible = this.showCompleted ? allTasks : allTasks.filter((t) => !t.completed);
		const sorted = this.sortTasks(visible);

		const section = root.createDiv({ cls: "recall-section" });

		// Header row
		const header = section.createDiv({ cls: "recall-section-header" });
		const titleRow = header.createDiv({ cls: "recall-section-title-row" });
		titleRow.createSpan({ cls: "recall-section-title", text: "Tasks" });
		titleRow.createSpan({ cls: "recall-count", text: String(visible.length) });

		const toggleBtn = header.createEl("button", {
			cls: "recall-toggle-btn",
			text: this.showCompleted ? "Hide completed" : "Show completed",
		});
		toggleBtn.addEventListener("click", () => {
			this.showCompleted = !this.showCompleted;
			this.render();
		});

		if (sorted.length === 0) {
			section.createDiv({ cls: "recall-empty", text: "No tasks found." });
			return;
		}

		const list = section.createDiv({ cls: "recall-list" });

		const withDue = sorted.filter((t) => t.dueDate);
		const withoutDue = sorted.filter((t) => !t.dueDate);

		for (const task of withDue) {
			this.renderTaskItem(list, task);
		}

		if (withoutDue.length > 0) {
			const byFile = this.groupByFile(withoutDue);
			for (const [filePath, tasks] of byFile) {
				const label = this.fileLabel(filePath);
				list.createDiv({ cls: "recall-file-group-header", text: label });
				for (const task of tasks) {
					this.renderTaskItem(list, task);
				}
			}
		}
	}

	private renderTaskItem(container: HTMLElement, task: TaskDesignation): void {
		const item = container.createDiv({
			cls: ["recall-item", "recall-task", task.completed ? "recall-completed" : ""].join(" ").trim(),
		});

		item.createSpan({
			cls: "recall-checkbox",
			text: task.completed ? "✓" : "○",
		});

		const content = item.createDiv({ cls: "recall-item-content" });
		content.createSpan({ cls: "recall-item-text", text: task.text });

		if (task.dueDate) {
			const today = new Date().toISOString().slice(0, 10);
			const overdue = !task.completed && task.dueDate < today;
			content.createSpan({
				cls: ["recall-due-date", overdue ? "recall-overdue" : ""].join(" ").trim(),
				text: `due: ${task.dueDate}`,
			});
		}

		item.addEventListener("click", () =>
			this.navigateTo(task.filePath, task.lineNumber)
		);
	}

	// ── Reminders ────────────────────────────────────────────────────────────

	private renderRemindersSection(root: HTMLElement): void {
		const reminders = this.sortReminders(this.plugin.vaultIndex.getReminders());

		const section = root.createDiv({ cls: "recall-section" });

		const header = section.createDiv({ cls: "recall-section-header" });
		const titleRow = header.createDiv({ cls: "recall-section-title-row" });
		titleRow.createSpan({ cls: "recall-section-title", text: "Reminders" });
		titleRow.createSpan({ cls: "recall-count", text: String(reminders.length) });

		if (reminders.length === 0) {
			section.createDiv({ cls: "recall-empty", text: "No reminders found." });
			return;
		}

		const list = section.createDiv({ cls: "recall-list" });
		const byFile = this.groupByFile(reminders);

		for (const [filePath, items] of byFile) {
			list.createDiv({ cls: "recall-file-group-header", text: this.fileLabel(filePath) });
			for (const reminder of items) {
				this.renderReminderItem(list, reminder);
			}
		}
	}

	private renderReminderItem(container: HTMLElement, reminder: ReminderDesignation): void {
		const item = container.createDiv({ cls: "recall-item recall-reminder" });
		const content = item.createDiv({ cls: "recall-item-content" });
		content.createSpan({ cls: "recall-item-text", text: reminder.text });
		item.addEventListener("click", () =>
			this.navigateTo(reminder.filePath, reminder.lineNumber)
		);
	}

	toggleCompleted(): void {
		this.showCompleted = !this.showCompleted;
		this.render();
	}

	// ── Sorting / grouping ───────────────────────────────────────────────────

	private sortTasks(tasks: TaskDesignation[]): TaskDesignation[] {
		return [...tasks].sort((a, b) => {
			if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
			if (a.dueDate) return -1;
			if (b.dueDate) return 1;
			const fc = a.filePath.localeCompare(b.filePath);
			return fc !== 0 ? fc : a.lineNumber - b.lineNumber;
		});
	}

	private sortReminders(reminders: ReminderDesignation[]): ReminderDesignation[] {
		return [...reminders].sort((a, b) => {
			const fc = a.filePath.localeCompare(b.filePath);
			return fc !== 0 ? fc : a.lineNumber - b.lineNumber;
		});
	}

	private groupByFile<T extends { filePath: string }>(items: T[]): Map<string, T[]> {
		const map = new Map<string, T[]>();
		for (const item of items) {
			const existing = map.get(item.filePath);
			if (existing) {
				existing.push(item);
			} else {
				map.set(item.filePath, [item]);
			}
		}
		return map;
	}

	// ── Navigation ───────────────────────────────────────────────────────────

	private async navigateTo(filePath: string, lineNumber: number): Promise<void> {
		const abstract = this.app.vault.getAbstractFileByPath(filePath);
		if (!(abstract instanceof TFile)) return;

		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.openFile(abstract);
		this.app.workspace.revealLeaf(leaf);

		const view = leaf.view;
		if (view instanceof MarkdownView) {
			view.editor.setCursor({ line: lineNumber, ch: 0 });
			view.editor.scrollIntoView(
				{ from: { line: lineNumber, ch: 0 }, to: { line: lineNumber, ch: 0 } },
				true
			);
		}
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private fileLabel(filePath: string): string {
		return filePath.split("/").pop()?.replace(/\.md$/, "") ?? filePath;
	}
}
