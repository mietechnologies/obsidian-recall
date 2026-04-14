export type DesignationType = "task" | "reminder";

export type BaseDesignation = {
	id: string;
	type: DesignationType;
	text: string;
	filePath: string;
	lineNumber: number;
	rawLine: string;
};

export type TaskDesignation = BaseDesignation & {
	type: "task";
	completed: boolean;
	dueDate?: string;
};

export type ReminderDesignation = BaseDesignation & {
	type: "reminder";
};

export type Designation = TaskDesignation | ReminderDesignation;

export interface DesignationParser {
	readonly type: DesignationType;
	parseLine(line: string, lineNumber: number, filePath: string): Designation | null;
}
