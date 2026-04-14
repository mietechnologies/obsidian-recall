import { DesignationParser, ReminderDesignation } from "../types";

// Matches: Reminder:: Some text  (must start at the beginning of the line)
const REMINDER_REGEX = /^Reminder:: (.+)$/;

export class ReminderParser implements DesignationParser {
	readonly type = "reminder" as const;

	parseLine(line: string, lineNumber: number, filePath: string): ReminderDesignation | null {
		const match = REMINDER_REGEX.exec(line);
		if (!match) return null;

		const [, text] = match;

		return {
			id: `${filePath}:${lineNumber}`,
			type: "reminder",
			text: text.trim(),
			filePath,
			lineNumber,
			rawLine: line,
		};
	}
}
