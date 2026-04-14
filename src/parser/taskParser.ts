import { DesignationParser, TaskDesignation } from "../types";

// Matches: - [ ] Task:: Some text
//      or: - [x] Task:: Some text | due: 2026-04-20
const TASK_REGEX = /^- \[([ x])\] Task:: (.+?)(?:\s*\|\s*due:\s*(\d{4}-\d{2}-\d{2}))?\s*$/;

export class TaskParser implements DesignationParser {
	readonly type = "task" as const;

	parseLine(line: string, lineNumber: number, filePath: string): TaskDesignation | null {
		const match = TASK_REGEX.exec(line);
		if (!match) return null;

		const [, completionMark, text, dueDate] = match;

		return {
			id: `${filePath}:${lineNumber}`,
			type: "task",
			text: text.trim(),
			filePath,
			lineNumber,
			rawLine: line,
			completed: completionMark === "x",
			...(dueDate ? { dueDate } : {}),
		};
	}
}
