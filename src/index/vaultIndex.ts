import { App, TAbstractFile, TFile, TFolder, EventRef } from "obsidian";
import { Designation, TaskDesignation, ReminderDesignation } from "../types";
import { ParserRegistry } from "../parser";

type ChangeCallback = () => void;

export class VaultIndex {
	private index: Map<string, Designation[]> = new Map();
	private listeners: Set<ChangeCallback> = new Set();
	private eventRefs: EventRef[] = [];
	private modifyTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
	private registry = new ParserRegistry();

	constructor(private app: App) {}

	async buildIndex(scopeFolder?: string): Promise<void> {
		this.index.clear();
		const files = this.getScopedFiles(scopeFolder);
		await Promise.all(files.map((f) => this.indexFile(f)));
		this.notify();
	}

	registerEvents(scopeFolder?: string): void {
		const { vault } = this.app;

		this.eventRefs.push(
			vault.on("modify", (file: TAbstractFile) => {
				if (!(file instanceof TFile) || file.extension !== "md") return;
				if (!this.isInScope(file.path, scopeFolder)) return;
				this.scheduleReindex(file);
			}),
			vault.on("create", async (file: TAbstractFile) => {
				if (!(file instanceof TFile) || file.extension !== "md") return;
				if (!this.isInScope(file.path, scopeFolder)) return;
				await this.indexFile(file);
				this.notify();
			}),
			vault.on("delete", (file: TAbstractFile) => {
				if (!(file instanceof TFile)) return;
				if (this.index.delete(file.path)) this.notify();
			}),
			vault.on("rename", async (file: TAbstractFile, oldPath: string) => {
				if (!(file instanceof TFile) || file.extension !== "md") return;
				this.index.delete(oldPath);
				if (this.isInScope(file.path, scopeFolder)) {
					await this.indexFile(file);
				}
				this.notify();
			})
		);
	}

	unregisterEvents(): void {
		for (const ref of this.eventRefs) {
			this.app.vault.offref(ref);
		}
		this.eventRefs = [];

		for (const timer of this.modifyTimers.values()) {
			clearTimeout(timer);
		}
		this.modifyTimers.clear();
	}

	onChange(cb: ChangeCallback): () => void {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	getAll(): Designation[] {
		return Array.from(this.index.values()).flat();
	}

	getTasks(): TaskDesignation[] {
		return this.getAll().filter((d): d is TaskDesignation => d.type === "task");
	}

	getReminders(): ReminderDesignation[] {
		return this.getAll().filter((d): d is ReminderDesignation => d.type === "reminder");
	}

	private scheduleReindex(file: TFile): void {
		const existing = this.modifyTimers.get(file.path);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(async () => {
			this.modifyTimers.delete(file.path);
			await this.indexFile(file);
			this.notify();
		}, 400);

		this.modifyTimers.set(file.path, timer);
	}

	private async indexFile(file: TFile): Promise<void> {
		try {
			const content = await this.app.vault.read(file);
			const designations = this.registry.parseFile(content, file.path);
			if (designations.length > 0) {
				this.index.set(file.path, designations);
			} else {
				this.index.delete(file.path);
			}
		} catch {
			this.index.delete(file.path);
		}
	}

	private getScopedFiles(scopeFolder?: string): TFile[] {
		if (!scopeFolder) {
			return this.app.vault.getMarkdownFiles();
		}
		const abstract = this.app.vault.getAbstractFileByPath(scopeFolder);
		if (!(abstract instanceof TFolder)) return [];
		return this.getMarkdownFilesInFolder(abstract);
	}

	private getMarkdownFilesInFolder(folder: TFolder): TFile[] {
		const files: TFile[] = [];
		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === "md") {
				files.push(child);
			} else if (child instanceof TFolder) {
				files.push(...this.getMarkdownFilesInFolder(child));
			}
		}
		return files;
	}

	private isInScope(filePath: string, scopeFolder?: string): boolean {
		if (!scopeFolder) return true;
		return filePath === scopeFolder || filePath.startsWith(scopeFolder + "/");
	}

	private notify(): void {
		for (const cb of this.listeners) cb();
	}
}
