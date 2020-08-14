import { Request, Response } from "express";

import db from "../database/connection";
import convertHourToMinutes from "../utilities/convertHourToMinutes";

interface ScheduleItem {
	week_day: number;
	from: string;
	to: string;
}

export default class LessonsController {
	async index(request: Request, response: Response) {
		const filters = request.query;

		const subject = filters.subject as string;
		const week_day = filters.week_day as string;
		const time = filters.time as string;

		if (!filters.week_day || !filters.subject || !filters.time) {
			return response.status(400).json({
				error: "Missing filters to search lessons",
			});
		}

		const timeInMinutes = convertHourToMinutes(time);

		const lessons = await db("lessons")
			.whereExists(function () {
				this.select("lesson_schedule.*")
					.from("lesson_schedule")
					.whereRaw("`lesson_schedule`.`lesson_id` = `lessons`.`id`")
					.whereRaw("`lesson_schedule`.`week_day` = ??", [Number(week_day)])
					.whereRaw("`lesson_schedule`.`from` <= ??", [timeInMinutes])
					.whereRaw("`lesson_schedule`.`to` >= ??", [timeInMinutes + 30]);
			})
			.where("lessons.subject", "=", subject)
			.join("users", "lessons.user_id", "=", "users.id")
			.select(["lessons.*", "users.*"]);

		return response.json(lessons);
	}

	async create(request: Request, response: Response) {
		const {
			name,
			avatar,
			whatsapp,
			bio,
			subject,
			cost,
			schedule,
		} = request.body;

		const trx = await db.transaction();

		try {
			const insertedUsersIds = await trx("users").insert({
				name,
				avatar,
				whatsapp,
				bio,
			});

			const user_id = insertedUsersIds[0];

			const insertedLessonsIds = await trx("lessons").insert({
				subject,
				cost,
				user_id,
			});

			const lesson_id = insertedLessonsIds[0];

			const lessonSchedule = schedule.map((scheduleItem: ScheduleItem) => {
				return {
					lesson_id,
					week_day: scheduleItem.week_day,
					from: convertHourToMinutes(scheduleItem.from),
					to: convertHourToMinutes(scheduleItem.to),
				};
			});

			await trx("lesson_schedule").insert(lessonSchedule);

			await trx.commit();

			return response.status(201).send();
		} catch (err) {
			await trx.rollback();

			return response.status(400).json({
				error: "Unexpected error while creating new lesson",
			});
		}
	}
}
