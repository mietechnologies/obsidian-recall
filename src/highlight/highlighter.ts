import { Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { MarkdownPostProcessorContext } from "obsidian";

const DESIGNATION_RE = /Task::|Reminder::/g;

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.sliceDoc(from, to);
		DESIGNATION_RE.lastIndex = 0;

		let match: RegExpExecArray | null;
		while ((match = DESIGNATION_RE.exec(text)) !== null) {
			const start = from + match.index;
			const end = start + match[0].length;
			const cls =
				match[0] === "Task::"
					? "recall-highlight-task"
					: "recall-highlight-reminder";
			builder.add(start, end, Decoration.mark({ class: cls }));
		}
	}

	return builder.finish();
}

export function createHighlightExtension(): Extension {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = buildDecorations(update.view);
				}
			}
		},
		{ decorations: (v) => v.decorations }
	);
}

export function readingViewPostProcessor(
	el: HTMLElement,
	_ctx: MarkdownPostProcessorContext
): void {
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const hits: Text[] = [];

	let node: Node | null;
	while ((node = walker.nextNode())) {
		const t = node.textContent ?? "";
		if (t.includes("Task::") || t.includes("Reminder::")) {
			hits.push(node as Text);
		}
	}

	for (const textNode of hits) {
		const parent = textNode.parentNode;
		if (!parent) continue;

		const text = textNode.textContent ?? "";
		const fragment = document.createDocumentFragment();
		const re = /Task::|Reminder::/g;
		let last = 0;
		let m: RegExpExecArray | null;

		while ((m = re.exec(text)) !== null) {
			if (m.index > last) {
				fragment.appendChild(document.createTextNode(text.slice(last, m.index)));
			}
			const span = document.createElement("span");
			span.className =
				m[0] === "Task::" ? "recall-highlight-task" : "recall-highlight-reminder";
			span.textContent = m[0];
			fragment.appendChild(span);
			last = m.index + m[0].length;
		}

		if (last < text.length) {
			fragment.appendChild(document.createTextNode(text.slice(last)));
		}

		parent.replaceChild(fragment, textNode);
	}
}
