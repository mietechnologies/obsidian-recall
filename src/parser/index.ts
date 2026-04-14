import { Designation, DesignationParser } from "../types";
import { TaskParser } from "./taskParser";
import { ReminderParser } from "./reminderParser";

export class ParserRegistry {
	private parsers: DesignationParser[] = [];

	constructor() {
		this.register(new TaskParser());
		this.register(new ReminderParser());
	}

	register(parser: DesignationParser): void {
		this.parsers.push(parser);
	}

	parseFile(content: string, filePath: string): Designation[] {
		const lines = content.split("\n");
		const results: Designation[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			for (const parser of this.parsers) {
				const result = parser.parseLine(line, i, filePath);
				if (result) {
					results.push(result);
					break; // one designation per line
				}
			}
		}

		return results;
	}
}
