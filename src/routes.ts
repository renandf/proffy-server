import express from "express";
import LessonsController from "./controllers/LessonsController";
import ConnectionsController from "./controllers/ConnectionsController";

const routes = express.Router();
const lessonsControllers = new LessonsController();
const connectionsController = new ConnectionsController();

routes.get("/lessons", lessonsControllers.index);
routes.post("/lessons", lessonsControllers.create);

routes.get("/connections", connectionsController.index);
routes.post("/connections", connectionsController.create);

export default routes;
