import { Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { MarkdownPostProcessorContext } from "obsidian";

// Capture groups: match[1] = keyword ("Task" | "Reminder"), match[2] = "::"
const DESIGNATION_RE = /(Task|Reminder)(::)/g;

// Empty widget used to replace "::" in the editor — keeps the characters in
// the document but renders nothing, so the cursor can still pass through.
class HiddenColonsWidget extends WidgetType {
	toDOM(): HTMLElement {
		return document.createElement("span");
	}
	ignoreEvent(): boolean {
		return false;
	}
}

const HIDDEN_COLONS = new HiddenColonsWidget();

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.sliceDoc(from, to);
		DESIGNATION_RE.lastIndex = 0;

		let match: RegExpExecArray | null;
		while ((match = DESIGNATION_RE.exec(text)) !== null) {
			const matchStart = from + match.index;
			const keywordEnd = matchStart + match[1].length; // end of "Task" / "Reminder"
			const fullEnd = matchStart + match[0].length;   // end of "::"

			const cls =
				match[1] === "Task"
					? "recall-highlight-task"
					: "recall-highlight-reminder";

			// Highlight the keyword
			builder.add(matchStart, keywordEnd, Decoration.mark({ class: cls }));
			// Hide the "::" (adjacent, non-overlapping)
			builder.add(keywordEnd, fullEnd, Decoration.replace({ widget: HIDDEN_COLONS }));
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
		const re = /(Task|Reminder)(::)/g;
		let last = 0;
		let m: RegExpExecArray | null;

		while ((m = re.exec(text)) !== null) {
			if (m.index > last) {
				fragment.appendChild(document.createTextNode(text.slice(last, m.index)));
			}
			const span = document.createElement("span");
			span.className =
				m[1] === "Task" ? "recall-highlight-task" : "recall-highlight-reminder";
			span.textContent = m[1]; // "Task" or "Reminder" — "::" intentionally omitted
			fragment.appendChild(span);
			last = m.index + m[0].length;
		}

		if (last < text.length) {
			fragment.appendChild(document.createTextNode(text.slice(last)));
		}

		parent.replaceChild(fragment, textNode);
	}
}
